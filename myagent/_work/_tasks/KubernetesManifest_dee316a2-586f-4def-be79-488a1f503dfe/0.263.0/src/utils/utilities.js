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
exports.getTrafficSplitAPIVersion = exports.substituteImageNameInSpecFile = exports.annotateChildPods = exports.checkForErrors = exports.getDeleteCmdArgs = exports.createKubectlArgs = exports.getKubectl = exports.getConnection = exports.getManifestFiles = void 0;
const tl = require("azure-pipelines-task-lib/task");
const kubectlutility = require("azure-pipelines-tasks-kubernetes-common/kubectlutility");
const kubernetesconstants_1 = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const kubernetesconnection_1 = require("azure-pipelines-tasks-kubernetes-common/kubernetesconnection");
const filehelper = require("./FileHelper");
function getManifestFiles(manifestFilePaths) {
    if (!manifestFilePaths) {
        tl.debug('file input is not present');
        return null;
    }
    const files = tl.findMatch(tl.getVariable('System.DefaultWorkingDirectory') || process.cwd(), manifestFilePaths);
    return files;
}
exports.getManifestFiles = getManifestFiles;
function getConnection() {
    const kubernetesServiceConnection = tl.getInput('kubernetesServiceConnection', true);
    const tempPath = filehelper.getNewUserDirPath();
    const connection = new kubernetesconnection_1.KubernetesConnection(kubernetesServiceConnection, tempPath);
    return connection;
}
exports.getConnection = getConnection;
function getKubectl() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return Promise.resolve(tl.which('kubectl', true));
        }
        catch (ex) {
            return kubectlutility.downloadKubectl(yield kubectlutility.getStableKubectlVersion());
        }
    });
}
exports.getKubectl = getKubectl;
function createKubectlArgs(kind, names) {
    let args = '';
    if (!!kind) {
        args = args + kind;
    }
    if (!!names && names.size > 0) {
        args = args + ' ' + Array.from(names.values()).join(' ');
    }
    return args;
}
exports.createKubectlArgs = createKubectlArgs;
function getDeleteCmdArgs(argsPrefix, inputArgs) {
    let args = '';
    if (!!argsPrefix && argsPrefix.length > 0) {
        args = argsPrefix;
    }
    if (!!inputArgs && inputArgs.length > 0) {
        if (args.length > 0) {
            args = args + ' ';
        }
        args = args + inputArgs;
    }
    return args;
}
exports.getDeleteCmdArgs = getDeleteCmdArgs;
function checkForErrors(execResults, warnIfError) {
    if (execResults.length !== 0) {
        let stderr = '';
        execResults.forEach(result => {
            if (result.stderr) {
                if (result.code !== 0) {
                    stderr += result.stderr + '\n';
                }
                else {
                    tl.warning(result.stderr);
                }
            }
        });
        if (stderr.length > 0) {
            if (!!warnIfError) {
                tl.warning(stderr.trim());
            }
            else {
                throw new Error(stderr.trim());
            }
        }
    }
}
exports.checkForErrors = checkForErrors;
function annotateChildPods(kubectl, resourceType, resourceName, allPods) {
    const commandExecutionResults = [];
    let owner = resourceName;
    if (resourceType.toLowerCase().indexOf('deployment') > -1) {
        owner = kubectl.getNewReplicaSet(resourceName);
    }
    if (!!allPods && !!allPods.items && allPods.items.length > 0) {
        allPods.items.forEach((pod) => {
            const owners = pod.metadata.ownerReferences;
            if (!!owners) {
                owners.forEach(ownerRef => {
                    if (ownerRef.name === owner) {
                        commandExecutionResults.push(kubectl.annotate('pod', pod.metadata.name, kubernetesconstants_1.pipelineAnnotations, true));
                    }
                });
            }
        });
    }
    return commandExecutionResults;
}
exports.annotateChildPods = annotateChildPods;
/*
    For example,
        currentString: `image: "example/example-image"`
        imageName: `example/example-image`
        imageNameWithNewTag: `example/example-image:identifiertag`

    This substituteImageNameInSpecFile function would return
        return Value: `image: "example/example-image:identifiertag"`
*/
function substituteImageNameInSpecFile(currentString, imageName, imageNameWithNewTag) {
    if (currentString.indexOf(imageName) < 0) {
        tl.debug(`No occurence of replacement token: ${imageName} found`);
        return currentString;
    }
    return currentString.split('\n').reduce((acc, line) => {
        const imageKeyword = line.match(/^ *image:/);
        if (imageKeyword) {
            let [currentImageName, currentImageTag] = line
                .substring(imageKeyword[0].length) // consume the line from keyword onwards
                .trim()
                .replace(/[',"]/g, '') // replace allowed quotes with nothing
                .split(':');
            if (!currentImageTag && currentImageName.indexOf(' ') > 0) {
                currentImageName = currentImageName.split(' ')[0]; // Stripping off comments
            }
            if (currentImageName === imageName) {
                return acc + `${imageKeyword[0]} ${imageNameWithNewTag}\n`;
            }
        }
        return acc + line + '\n';
    }, '');
}
exports.substituteImageNameInSpecFile = substituteImageNameInSpecFile;
function getTrafficSplitAPIVersion(kubectl) {
    const result = kubectl.executeCommand('api-versions');
    const trafficSplitAPIVersion = result.stdout.split('\n').find(version => version.startsWith('split.smi-spec.io'));
    if (trafficSplitAPIVersion == null || typeof trafficSplitAPIVersion == 'undefined') {
        throw new Error(tl.loc('UnableToCreateTrafficSplitManifestFile', 'Could not find a valid api version for TrafficSplit object'));
    }
    tl.debug("api-version: " + trafficSplitAPIVersion);
    return trafficSplitAPIVersion;
}
exports.getTrafficSplitAPIVersion = getTrafficSplitAPIVersion;
