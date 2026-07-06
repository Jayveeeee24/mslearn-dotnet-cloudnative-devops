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
exports.bake = void 0;
const tl = require("azure-pipelines-task-lib/task");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const helmutility = require("azure-pipelines-tasks-kubernetes-common/helmutility");
const uuidV4 = require("uuid/v4");
const FileHelper_1 = require("../utils/FileHelper");
const helm_object_model_1 = require("azure-pipelines-tasks-kubernetes-common/helm-object-model");
const TaskParameters = require("../models/TaskInputParameters");
const installers_1 = require("../utils/installers");
const utils = require("../utils/utilities");
const DeploymentHelper = require("../utils/DeploymentHelper");
const TaskInputParameters = require("../models/TaskInputParameters");
class RenderEngine {
    constructor() {
        this.getTemplatePath = () => {
            return path.join((0, FileHelper_1.getTempDirectory)(), 'baked-template-' + uuidV4() + '.yaml');
        };
    }
    updateImages(filePath) {
        if (TaskInputParameters.containers.length > 0 && fs.existsSync(filePath)) {
            const updatedFilesPaths = DeploymentHelper.updateResourceObjects([filePath], [], TaskInputParameters.containers);
            let fileContents = [];
            updatedFilesPaths.forEach((path) => {
                const content = yaml.safeDump(JSON.parse(fs.readFileSync(path).toString()));
                fileContents.push(content);
            });
            fs.writeFileSync(filePath, fileContents.join("\n---\n"));
        }
    }
}
class HelmRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            // Helm latest releases require restricted permissions on Kubeconfig
            const kubeconfigPath = tl.getVariable('KUBECONFIG');
            if (kubeconfigPath)
                fs.chmodSync(kubeconfigPath, '600');
            const helmPath = yield helmutility.getHelm();
            const helmCommand = new helm_object_model_1.Helm(helmPath, TaskParameters.namespace);
            const helmReleaseName = tl.getInput('releaseName', false);
            const result = helmCommand.template(helmReleaseName, tl.getPathInput('helmChart', true), tl.getDelimitedInput('overrideFiles', '\n'), this.getOverrideValues());
            if (result.stderr) {
                tl.setResult(tl.TaskResult.Failed, result.stderr);
                return;
            }
            tl.debug(result.stdout);
            const pathToBakedManifest = this.getTemplatePath();
            fs.writeFileSync(pathToBakedManifest, result.stdout);
            this.updateImages(pathToBakedManifest);
            tl.setVariable('manifestsBundle', pathToBakedManifest);
        });
    }
    getOverrideValues() {
        const overridesInput = tl.getDelimitedInput('overrides', '\n');
        const overrideValues = [];
        overridesInput.forEach(arg => {
            const overrideInput = arg.split(':');
            const overrideName = overrideInput[0];
            const overrideValue = overrideInput.slice(1).join(':');
            overrideValues.push({
                name: overrideName,
                value: overrideValue
            });
        });
        return overrideValues;
    }
}
class KomposeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            if (!tl.filePathSupplied('dockerComposeFile')) {
                throw new Error(tl.loc('DockerComposeFilePathNotSupplied'));
            }
            const dockerComposeFilePath = tl.getPathInput('dockerComposeFile', true, true);
            const installer = new installers_1.KomposeInstaller();
            let path = installer.checkIfExists();
            if (!path) {
                path = yield installer.install();
            }
            const tool = tl.tool(path);
            const pathToBakedManifest = this.getTemplatePath();
            tool.arg(['convert', '-f', dockerComposeFilePath, '-o', pathToBakedManifest]);
            const result = tool.execSync();
            if (result.code !== 0 || result.error) {
                throw result.error;
            }
            tl.debug(result.stdout);
            this.updateImages(pathToBakedManifest);
            tl.setVariable('manifestsBundle', pathToBakedManifest);
        });
    }
}
class KustomizeRenderEngine extends RenderEngine {
    constructor() {
        super(...arguments);
        this.bake = () => __awaiter(this, void 0, void 0, function* () {
            const kubectlPath = yield utils.getKubectl();
            this.validateKustomize(kubectlPath);
            const command = tl.tool(kubectlPath);
            console.log(`[command] ${kubectlPath} kustomize ${tl.getPathInput('kustomizationPath')}`);
            command.arg(['kustomize', tl.getPathInput('kustomizationPath')]);
            const result = command.execSync({ silent: true });
            if (result.stderr) {
                tl.setResult(tl.TaskResult.Failed, result.stderr);
                return;
            }
            tl.debug(result.stdout);
            const pathToBakedManifest = this.getTemplatePath();
            fs.writeFileSync(pathToBakedManifest, result.stdout);
            this.updateImages(pathToBakedManifest);
            tl.setVariable('manifestsBundle', pathToBakedManifest);
        });
    }
    validateKustomize(kubectlPath) {
        const command = tl.tool(kubectlPath);
        command.arg(['version', '--client=true', '-o', 'json']);
        const result = command.execSync();
        if (result.code !== 0) {
            throw result.error;
        }
        const clientVersion = JSON.parse(result.stdout).clientVersion;
        if (clientVersion && parseInt(clientVersion.major) >= 1 && parseInt(clientVersion.minor) >= 14) {
            // Do nothing
        }
        else {
            throw new Error(tl.loc('KubectlShouldBeUpgraded'));
        }
    }
}
function bake(ignoreSslErrors) {
    return __awaiter(this, void 0, void 0, function* () {
        const renderType = tl.getInput('renderType', true);
        let renderEngine;
        switch (renderType) {
            case 'helm':
            case 'helm2':
                renderEngine = new HelmRenderEngine();
                break;
            case 'kompose':
                renderEngine = new KomposeRenderEngine();
                break;
            case 'kustomize':
                renderEngine = new KustomizeRenderEngine();
                break;
            default:
                throw Error(tl.loc('UnknownRenderType'));
        }
        yield renderEngine.bake();
    });
}
exports.bake = bake;
