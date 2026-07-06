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
exports.deploy = void 0;
const deploymentHelper = require("../utils/DeploymentHelper");
const TaskInputParameters = require("../models/TaskInputParameters");
const utils = require("../utils/utilities");
const kubectl_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/kubectl-object-model");
function deploy(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        TaskInputParameters.validateCanaryPercentage();
        TaskInputParameters.validateReplicaCount();
        TaskInputParameters.validateTimeoutForRolloutStatus();
        const kubectlPath = yield utils.getKubectl();
        const kubectl = new kubectl_object_model_1.Kubectl(kubectlPath, TaskInputParameters.namespace, ignoreSslErrors);
        yield deploymentHelper.deploy(kubectl, TaskInputParameters.manifests, TaskInputParameters.deploymentStrategy);
    });
}
exports.deploy = deploy;
