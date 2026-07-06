"use strict";
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
exports.KomposeInstaller = exports.Installer = void 0;
const os = require("os");
const toolLib = require("azure-pipelines-tool-lib/tool");
const tl = require("azure-pipelines-task-lib/task");
const path = require("path");
const fs = require("fs");
class Installer {
    getExecutableExtension() {
        switch (os.type()) {
            case 'Windows_NT':
                return `.exe`;
            default:
                return ``;
        }
    }
}
exports.Installer = Installer;
class KomposeInstaller extends Installer {
    constructor() {
        super(...arguments);
        this.checkIfExists = () => {
            try {
                const toolPath = tl.which(this.toolName, true);
                return toolPath;
            }
            catch (ex) {
                // Finding in tool lib cache
                const toolPath = toolLib.findLocalTool(this.toolName, this.defaultVersion);
                if (toolPath) {
                    return path.join(toolPath, this.tool);
                }
                return '';
            }
        };
        this.install = () => __awaiter(this, void 0, void 0, function* () {
            let toolPath = yield toolLib.downloadTool(this.getDownloadUrl(), this.toolName);
            const cachedFolderPath = yield toolLib.cacheFile(toolPath, this.tool, this.toolName, this.defaultVersion);
            toolPath = path.join(cachedFolderPath, this.tool);
            fs.chmodSync(toolPath, 0o100); // execute/search by owner permissions to the tool
            return path.join(cachedFolderPath, this.tool);
        });
        this.defaultVersion = 'v1.18.0';
        this.toolName = 'kompose';
        this.tool = `${this.toolName}${this.getExecutableExtension()}`;
    }
    getDownloadUrl() {
        switch (os.type()) {
            case 'Linux':
                return `https://github.com/kubernetes/kompose/releases/download/${this.defaultVersion}/kompose-linux-amd64`;
            case 'Darwin':
                return `https://github.com/kubernetes/kompose/releases/download/${this.defaultVersion}/kompose-darwin-amd64`;
            case 'Windows_NT':
                return `https://github.com/kubernetes/kompose/releases/download/${this.defaultVersion}/kompose-windows-amd64.exe`;
            default:
                throw Error('Unknown OS type');
        }
    }
}
exports.KomposeInstaller = KomposeInstaller;
