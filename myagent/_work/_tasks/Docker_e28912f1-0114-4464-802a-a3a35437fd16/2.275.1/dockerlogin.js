"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const Q = require("q");
function run(connection) {
    var defer = Q.defer();
    connection.setDockerConfigEnvVariable();
    defer.resolve(null);
    return defer.promise;
}
