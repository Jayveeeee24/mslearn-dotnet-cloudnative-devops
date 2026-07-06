'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReplicaCount = exports.validateCanaryPercentage = exports.validateTimeoutForRolloutStatus = exports.rolloutStatusTimeout = exports.dockerRegistryEndpoint = exports.secretName = exports.secretType = exports.secretArguments = exports.args = exports.baselineAndCanaryReplicas = exports.trafficSplitMethod = exports.deploymentStrategy = exports.canaryPercentage = exports.manifests = exports.imagePullSecrets = exports.containers = exports.namespace = void 0;
const tl = require("azure-pipelines-task-lib/task");
const canaryDeploymentHelper = require("../utils/CanaryDeploymentHelper");
exports.namespace = tl.getInput('namespace', false);
exports.containers = tl.getDelimitedInput('containers', '\n');
exports.imagePullSecrets = tl.getDelimitedInput('imagePullSecrets', '\n');
exports.manifests = tl.getDelimitedInput('manifests', '\n');
exports.canaryPercentage = tl.getInput('percentage');
exports.deploymentStrategy = tl.getInput('strategy', false);
exports.trafficSplitMethod = tl.getInput('trafficSplitMethod', false);
exports.baselineAndCanaryReplicas = tl.getInput('baselineAndCanaryReplicas', true);
exports.args = tl.getInput('arguments', false);
exports.secretArguments = tl.getInput('secretArguments', false) || '';
exports.secretType = tl.getInput('secretType', false);
exports.secretName = tl.getInput('secretName', false);
exports.dockerRegistryEndpoint = tl.getInput('dockerRegistryEndpoint', false);
exports.rolloutStatusTimeout = tl.getInput('rolloutStatusTimeout', false);
if (!exports.namespace) {
    const kubConnection = tl.getInput('kubernetesServiceConnection', false);
    if (kubConnection) {
        exports.namespace = tl.getEndpointDataParameter(kubConnection, 'namespace', true);
    }
}
if (!exports.namespace) {
    tl.debug('Namespace was not supplied nor present in the endpoint; using "default" namespace instead.');
    exports.namespace = 'default';
}
function validateTimeoutForRolloutStatus() {
    if (exports.rolloutStatusTimeout && !validateRegex("^\\d*$", exports.rolloutStatusTimeout)) {
        throw new Error(tl.loc('InvalidTimeoutValue'));
    }
}
exports.validateTimeoutForRolloutStatus = validateTimeoutForRolloutStatus;
function validateCanaryPercentage() {
    if (exports.deploymentStrategy.toUpperCase() === canaryDeploymentHelper.CANARY_DEPLOYMENT_STRATEGY && (!validateRegex("^(([0-9]|[1-9][0-9]|100)(\\.\\d*)?)$", exports.canaryPercentage) || parseFloat(exports.canaryPercentage) > 100)) {
        throw new Error(tl.loc('InvalidPercentage'));
    }
}
exports.validateCanaryPercentage = validateCanaryPercentage;
function validateReplicaCount() {
    if (exports.deploymentStrategy.toUpperCase() === canaryDeploymentHelper.CANARY_DEPLOYMENT_STRATEGY && exports.trafficSplitMethod.toUpperCase() === canaryDeploymentHelper.TRAFFIC_SPLIT_STRATEGY && !validateRegex("(^([0-9]|([1-9]\\d*))$)", exports.baselineAndCanaryReplicas)) {
        throw new Error(tl.loc('InvalidBaselineAndCanaryReplicas'));
    }
}
exports.validateReplicaCount = validateReplicaCount;
function validateRegex(regex, testString) {
    var percentageRegex = new RegExp(regex);
    return percentageRegex.test(testString);
}
