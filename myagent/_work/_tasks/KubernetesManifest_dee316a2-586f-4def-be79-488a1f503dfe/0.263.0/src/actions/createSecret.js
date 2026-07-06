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
exports.createSecret = void 0;
const kubectl_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/kubectl-object-model");
const utils = require("../utils/utilities");
const TaskInputParameters = require("../models/TaskInputParameters");
const StringComparison_1 = require("../utils/StringComparison");
const registryauthenticationtoken_1 = require("azure-pipelines-tasks-docker-common/registryauthenticationprovider/registryauthenticationtoken");
function createSecret(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        const kubectl = new kubectl_object_model_1.Kubectl(yield utils.getKubectl(), TaskInputParameters.namespace, ignoreSslErrors);
        let result;
        if ((0, StringComparison_1.isEqual)(TaskInputParameters.secretType, 'dockerRegistry', StringComparison_1.StringComparer.OrdinalIgnoreCase)) {
            const authProvider = (0, registryauthenticationtoken_1.getDockerRegistryEndpointAuthenticationToken)(TaskInputParameters.dockerRegistryEndpoint);
            result = kubectl.createDockerSecret(TaskInputParameters.secretName.trim(), authProvider.getLoginServerUrl(), authProvider.getUsername(), authProvider.getPassword(), authProvider.getEmail(), true);
        }
        else {
            result = kubectl.createGenericSecret(TaskInputParameters.secretName.trim(), TaskInputParameters.secretArguments.trim(), true);
        }
        utils.checkForErrors([result]);
    });
}
exports.createSecret = createSecret;
