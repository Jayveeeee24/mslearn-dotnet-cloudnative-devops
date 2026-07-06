'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateResourceObjects = exports.deploy = void 0;
const fs = require("fs");
const tl = require("azure-pipelines-task-lib/task");
const yaml = require("js-yaml");
const canaryDeploymentHelper = require("../utils/CanaryDeploymentHelper");
const KubernetesObjectUtility = require("../utils/KubernetesObjectUtility");
const constants = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const TaskInputParameters = require("../models/TaskInputParameters");
const models = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const fileHelper = require("../utils/FileHelper");
const utils = require("../utils/utilities");
const KubernetesManifestUtility = require("azure-pipelines-tasks-kubernetes-common/kubernetesmanifestutility");
const KubernetesConstants = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const StringComparison_1 = require("./StringComparison");
const image_metadata_helper_1 = require("azure-pipelines-tasks-kubernetes-common/image-metadata-helper");
const restutilities_1 = require("azure-pipelines-tasks-utility-common/restutilities");
const PodCanaryDeploymentHelper_1 = require("./PodCanaryDeploymentHelper");
const SMICanaryDeploymentHelper_1 = require("./SMICanaryDeploymentHelper");
function deploy(kubectl, manifestFilePaths, deploymentStrategy) {
    return __awaiter(this, void 0, void 0, function* () {
        // get manifest files
        let inputManifestFiles = getManifestFiles(manifestFilePaths);
        // imagePullSecrets addition & artifact substitution
        inputManifestFiles = updateResourceObjects(inputManifestFiles, TaskInputParameters.imagePullSecrets, TaskInputParameters.containers);
        // deployment
        const deployedManifestFiles = deployManifests(inputManifestFiles, kubectl, isCanaryDeploymentStrategy(deploymentStrategy));
        // check manifest stability
        const resourceTypes = KubernetesObjectUtility.getResources(deployedManifestFiles, models.deploymentTypes.concat([KubernetesConstants.DiscoveryAndLoadBalancerResource.service]));
        yield checkManifestStability(kubectl, resourceTypes);
        // print ingress resources
        const ingressResources = KubernetesObjectUtility.getResources(deployedManifestFiles, [KubernetesConstants.DiscoveryAndLoadBalancerResource.ingress]);
        ingressResources.forEach(ingressResource => {
            kubectl.getResource(KubernetesConstants.DiscoveryAndLoadBalancerResource.ingress, ingressResource.name);
        });
        // annotate resources
        let allPods;
        try {
            allPods = JSON.parse((kubectl.getAllPods()).stdout);
        }
        catch (e) {
            tl.debug("Unable to parse pods; Error: " + e);
        }
        annotateResources(deployedManifestFiles, kubectl, resourceTypes, allPods);
        // Capture and push deployment metadata only if deployment strategy is not specified (because for Canary/SMI we do not replace actual deployment objects)
        if (!isCanaryDeploymentStrategy(deploymentStrategy)) {
            try {
                const clusterInfo = kubectl.getClusterInfo().stdout;
                captureAndPushDeploymentMetadata(inputManifestFiles, allPods, deploymentStrategy, clusterInfo, manifestFilePaths);
            }
            catch (e) {
                tl.warning("Capturing deployment metadata failed with error: " + e);
            }
        }
    });
}
exports.deploy = deploy;
function getManifestFiles(manifestFilePaths) {
    const files = utils.getManifestFiles(manifestFilePaths);
    if (files == null || files.length === 0) {
        throw (tl.loc('ManifestFileNotFound', manifestFilePaths));
    }
    return files;
}
function deployManifests(files, kubectl, isCanaryDeploymentStrategy) {
    let result;
    if (isCanaryDeploymentStrategy) {
        let canaryDeploymentOutput;
        if (canaryDeploymentHelper.isSMICanaryStrategy()) {
            canaryDeploymentOutput = (0, SMICanaryDeploymentHelper_1.deploySMICanary)(kubectl, files);
        }
        else {
            canaryDeploymentOutput = (0, PodCanaryDeploymentHelper_1.deployPodCanary)(kubectl, files);
        }
        result = canaryDeploymentOutput.result;
        files = canaryDeploymentOutput.newFilePaths;
    }
    else {
        if (canaryDeploymentHelper.isSMICanaryStrategy()) {
            const updatedManifests = appendStableVersionLabelToResource(files, kubectl);
            result = kubectl.apply(updatedManifests);
        }
        else {
            result = kubectl.apply(files);
        }
    }
    utils.checkForErrors([result]);
    return files;
}
function appendStableVersionLabelToResource(files, kubectl) {
    const manifestFiles = [];
    const newObjectsList = [];
    files.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath);
        yaml.safeLoadAll(fileContents, function (inputObject) {
            const kind = inputObject.kind;
            if (KubernetesObjectUtility.isDeploymentEntity(kind)) {
                const updatedObject = canaryDeploymentHelper.markResourceAsStable(inputObject);
                newObjectsList.push(updatedObject);
            }
            else {
                manifestFiles.push(filePath);
            }
        });
    });
    const updatedManifestFiles = fileHelper.writeObjectsToFile(newObjectsList);
    manifestFiles.push(...updatedManifestFiles);
    return manifestFiles;
}
function checkManifestStability(kubectl, resources) {
    return __awaiter(this, void 0, void 0, function* () {
        yield KubernetesManifestUtility.checkManifestStability(kubectl, resources, TaskInputParameters.rolloutStatusTimeout);
    });
}
function annotateResources(files, kubectl, resourceTypes, allPods) {
    const annotateResults = [];
    annotateResults.push(kubectl.annotateFiles(files, constants.pipelineAnnotations, true));
    resourceTypes.forEach(resource => {
        if (resource.type.toUpperCase() !== models.KubernetesWorkload.pod.toUpperCase()) {
            utils.annotateChildPods(kubectl, resource.type, resource.name, allPods)
                .forEach(execResult => annotateResults.push(execResult));
        }
    });
    utils.checkForErrors(annotateResults, true);
}
function updateResourceObjects(filePaths, imagePullSecrets, containers) {
    const newObjectsList = [];
    const updateResourceObject = (inputObject) => {
        if (!!imagePullSecrets && imagePullSecrets.length > 0) {
            KubernetesObjectUtility.updateImagePullSecrets(inputObject, imagePullSecrets, false);
        }
        if (!!containers && containers.length > 0) {
            KubernetesObjectUtility.updateImageDetails(inputObject, containers);
        }
    };
    filePaths.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath).toString();
        yaml.safeLoadAll(fileContents, function (inputObject) {
            if (inputObject && inputObject.kind) {
                const kind = inputObject.kind;
                if (KubernetesObjectUtility.isWorkloadEntity(kind)) {
                    updateResourceObject(inputObject);
                }
                else if ((0, StringComparison_1.isEqual)(kind, 'list', StringComparison_1.StringComparer.OrdinalIgnoreCase)) {
                    let items = inputObject.items;
                    if (items.length > 0) {
                        items.forEach((item) => updateResourceObject(item));
                    }
                }
                newObjectsList.push(inputObject);
            }
        });
    });
    tl.debug('New K8s objects after addin imagePullSecrets are :' + JSON.stringify(newObjectsList));
    const newFilePaths = fileHelper.writeObjectsToFile(newObjectsList);
    return newFilePaths;
}
exports.updateResourceObjects = updateResourceObjects;
function captureAndPushDeploymentMetadata(filePaths, allPods, deploymentStrategy, clusterInfo, manifestFilePaths) {
    const requestUrl = (0, image_metadata_helper_1.getPublishDeploymentRequestUrl)();
    let metadata = {};
    filePaths.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath).toString();
        yaml.safeLoadAll(fileContents, function (inputObject) {
            if (!!inputObject && inputObject.kind && (0, image_metadata_helper_1.isDeploymentEntity)(inputObject.kind)) {
                metadata = (0, image_metadata_helper_1.getDeploymentMetadata)(inputObject, allPods, deploymentStrategy, clusterInfo, (0, image_metadata_helper_1.getManifestUrls)(manifestFilePaths));
                pushDeploymentDataToEvidenceStore(JSON.stringify(metadata), requestUrl).then((result) => {
                    tl.debug("DeploymentDetailsApiResponse: " + JSON.stringify(result));
                }, (error) => {
                    tl.warning("publishToImageMetadataStore failed with error: " + error);
                });
            }
        });
    });
}
function pushDeploymentDataToEvidenceStore(requestBody, requestUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const request = new restutilities_1.WebRequest();
        const accessToken = tl.getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'ACCESSTOKEN', false);
        request.uri = requestUrl;
        request.method = 'POST';
        request.body = requestBody;
        request.headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + accessToken
        };
        tl.debug("requestUrl: " + requestUrl);
        tl.debug("requestBody: " + requestBody);
        try {
            tl.debug("Sending request for pushing deployment data to Image meta data store");
            const response = yield (0, restutilities_1.sendRequest)(request);
            return response;
        }
        catch (error) {
            tl.debug("Unable to push to deployment details to Artifact Store, Error: " + error);
        }
        return Promise.resolve();
    });
}
function isCanaryDeploymentStrategy(deploymentStrategy) {
    return deploymentStrategy != null && deploymentStrategy.toUpperCase() === canaryDeploymentHelper.CANARY_DEPLOYMENT_STRATEGY.toUpperCase();
}
