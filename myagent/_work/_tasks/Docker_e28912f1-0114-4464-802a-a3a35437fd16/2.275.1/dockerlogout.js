"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const Q = require("q");
function run(connection) {
    // logging out is being handled in connection.close() method, called after the command execution.
    var defer = Q.defer();
    defer.resolve(null);
    return defer.promise;
}
