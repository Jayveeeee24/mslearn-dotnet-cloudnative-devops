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
exports.patch = void 0;
const tl = require("azure-pipelines-task-lib/task");
const kubectl_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/kubectl-object-model");
const utils = require("../utils/utilities");
const constants = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const TaskParameters = require("../models/TaskInputParameters");
function patch(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        TaskParameters.validateTimeoutForRolloutStatus();
        const kubectl = new kubectl_object_model_1.Kubectl(yield utils.getKubectl(), TaskParameters.namespace, ignoreSslErrors);
        let kind = tl.getInput('kind', false);
        if (kind)
            kind = kind.toLowerCase();
        let name = tl.getInput('name', false);
        const filePath = tl.getInput('resourceFileToPatch', false);
        const strategy = tl.getInput('mergeStrategy', false);
        const patch = tl.getInput('patch', true);
        if (tl.filePathSupplied('resourceFileToPatch') && tl.getInput('resourceToPatch') === 'file') {
            kind = '-f';
            name = filePath;
        }
        const result = kubectl.patch(kind, name, patch, strategy);
        utils.checkForErrors([result]);
        const resources = kubectl.getResources(result.stdout, ['deployment', 'replicaset', 'daemonset', 'pod', 'statefulset']);
        resources.forEach(resource => {
            utils.checkForErrors([kubectl.checkRolloutStatus(resource.type, resource.name, TaskParameters.rolloutStatusTimeout)]);
            utils.checkForErrors([kubectl.annotate(resource.type, resource.name, constants.pipelineAnnotations, true)]);
            utils.checkForErrors(utils.annotateChildPods(kubectl, resource.type, resource.name, JSON.parse((kubectl.getAllPods()).stdout)));
        });
    });
}
exports.patch = patch;
