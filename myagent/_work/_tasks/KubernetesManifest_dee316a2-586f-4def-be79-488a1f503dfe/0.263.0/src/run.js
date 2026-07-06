'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const path = require("path");
const utils = require("./utils/utilities");
const deploy_1 = require("./actions/deploy");
const bake_1 = require("./actions/bake");
const scale_1 = require("./actions/scale");
const patch_1 = require("./actions/patch");
const delete_1 = require("./actions/delete");
const promote_1 = require("./actions/promote");
const reject_1 = require("./actions/reject");
const createSecret_1 = require("./actions/createSecret");
tl.setResourcePath(path.join(__dirname, '..', 'task.json'));
function run() {
    const action = tl.getInput('action');
    if (action === 'bake') {
        return (0, bake_1.bake)();
    }
    const connection = utils.getConnection();
    let action_func = null;
    switch (action) {
        case 'deploy':
            action_func = deploy_1.deploy;
            break;
        case 'scale':
            action_func = scale_1.scale;
            break;
        case 'patch':
            action_func = patch_1.patch;
            break;
        case 'delete':
            action_func = delete_1.deleteResources;
            break;
        case 'promote':
            action_func = promote_1.promote;
            break;
        case 'reject':
            action_func = reject_1.reject;
            break;
        case 'createSecret':
            action_func = createSecret_1.createSecret;
            break;
        default:
            tl.setResult(tl.TaskResult.Failed, 'Not a supported action, choose from "bake", "deploy", "patch", "scale", "delete", "promote", "reject"');
            process.exit(1);
    }
    connection.open();
    return action_func(connection.ignoreSSLErrors)
        .then(() => connection.close())
        .catch((error) => {
        connection.close();
        throw error;
    });
}
run()
    .catch((error) => tl.setResult(tl.TaskResult.Failed, !!error.message ? error.message : error));
