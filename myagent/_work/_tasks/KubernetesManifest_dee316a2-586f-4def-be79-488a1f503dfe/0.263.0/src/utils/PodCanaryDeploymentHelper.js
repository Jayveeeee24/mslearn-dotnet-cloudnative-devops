'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPodCanary = void 0;
const tl = require("azure-pipelines-task-lib/task");
const fs = require("fs");
const yaml = require("js-yaml");
const TaskInputParameters = require("../models/TaskInputParameters");
const fileHelper = require("../utils/FileHelper");
const helper = require("../utils/KubernetesObjectUtility");
const canaryDeploymentHelper = require("../utils/CanaryDeploymentHelper");
function deployPodCanary(kubectl, filePaths) {
    const newObjectsList = [];
    const percentage = parseInt(TaskInputParameters.canaryPercentage);
    filePaths.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath);
        yaml.safeLoadAll(fileContents, function (inputObject) {
            const name = inputObject.metadata.name;
            const kind = inputObject.kind;
            if (helper.isDeploymentEntity(kind)) {
                tl.debug('Calculating replica count for canary');
                const canaryReplicaCount = calculateReplicaCountForCanary(inputObject, percentage);
                tl.debug('Replica count is ' + canaryReplicaCount);
                // Get stable object
                tl.debug('Querying stable object');
                const stableObject = canaryDeploymentHelper.fetchResource(kubectl, kind, name);
                if (!stableObject) {
                    tl.debug('Stable object not found. Creating only canary object');
                    // If stable object not found, create canary deployment.
                    const newCanaryObject = canaryDeploymentHelper.getNewCanaryResource(inputObject, canaryReplicaCount);
                    tl.debug('New canary object is: ' + JSON.stringify(newCanaryObject));
                    newObjectsList.push(newCanaryObject);
                }
                else {
                    tl.debug('Stable object found. Creating canary and baseline objects');
                    // If canary object not found, create canary and baseline object.
                    const newCanaryObject = canaryDeploymentHelper.getNewCanaryResource(inputObject, canaryReplicaCount);
                    const newBaselineObject = canaryDeploymentHelper.getNewBaselineResource(stableObject, canaryReplicaCount);
                    tl.debug('New canary object is: ' + JSON.stringify(newCanaryObject));
                    tl.debug('New baseline object is: ' + JSON.stringify(newBaselineObject));
                    newObjectsList.push(newCanaryObject);
                    newObjectsList.push(newBaselineObject);
                }
            }
            else {
                // Updating non deployment entity as it is.
                newObjectsList.push(inputObject);
            }
        });
    });
    const manifestFiles = fileHelper.writeObjectsToFile(newObjectsList);
    const result = kubectl.apply(manifestFiles);
    return { 'result': result, 'newFilePaths': manifestFiles };
}
exports.deployPodCanary = deployPodCanary;
function calculateReplicaCountForCanary(inputObject, percentage) {
    const inputReplicaCount = helper.getReplicaCount(inputObject);
    return Math.round((inputReplicaCount * percentage) / 100);
}
