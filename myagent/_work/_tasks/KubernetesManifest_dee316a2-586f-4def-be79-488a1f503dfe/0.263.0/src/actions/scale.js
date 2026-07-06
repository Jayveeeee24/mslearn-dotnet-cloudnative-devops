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
exports.scale = void 0;
const tl = require("azure-pipelines-task-lib/task");
const utils = require("../utils/utilities");
const constants = require("azure-pipelines-tasks-kubernetes-common/kubernetesconstants");
const TaskInputParameters = require("../models/TaskInputParameters");
const kubectl_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/kubectl-object-model");
function scale(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        TaskInputParameters.validateTimeoutForRolloutStatus();
        const kubectl = new kubectl_object_model_1.Kubectl(yield utils.getKubectl(), TaskInputParameters.namespace, ignoreSslErrors);
        const kind = tl.getInput('kind', true).toLowerCase();
        const replicas = tl.getInput('replicas', true);
        const name = tl.getInput('name', true);
        const result = kubectl.scale(kind, name, replicas);
        utils.checkForErrors([result]);
        utils.checkForErrors([kubectl.checkRolloutStatus(kind, name, TaskInputParameters.rolloutStatusTimeout)]);
        utils.checkForErrors([kubectl.annotate(kind, name, constants.pipelineAnnotations, true)]);
        utils.checkForErrors(utils.annotateChildPods(kubectl, kind, name, JSON.parse((kubectl.getAllPods()).stdout)));
    });
}
exports.scale = scale;
