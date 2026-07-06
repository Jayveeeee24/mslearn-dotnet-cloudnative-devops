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
exports.deleteResources = void 0;
const tl = require("azure-pipelines-task-lib/task");
const kubectl_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/kubectl-object-model");
const utils = require("../utils/utilities");
const TaskInputParameters = require("../models/TaskInputParameters");
function deleteResources(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        const args = TaskInputParameters.args;
        if (args == null || args.length === 0) {
            throw (tl.loc('ArgumentsInputNotSupplied'));
        }
        const kubectl = new kubectl_object_model_1.Kubectl(yield utils.getKubectl(), TaskInputParameters.namespace, ignoreSslErrors);
        const result = kubectl.delete(args);
        utils.checkForErrors([result]);
    });
}
exports.deleteResources = deleteResources;
