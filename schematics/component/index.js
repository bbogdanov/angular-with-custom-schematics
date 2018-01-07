"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
exports.__esModule = true;
var core_1 = require("@angular-devkit/core");
var schematics_1 = require("@angular-devkit/schematics");
require("rxjs/add/operator/merge");
function default_1(options) {
    return function (host, context) {
        options.path = options.path ? core_1.normalize(options.path) : options.path;
        var templateSource = schematics_1.apply(schematics_1.url('./files'), [
            schematics_1.template(__assign({}, options)),
        ]);
        return schematics_1.chain([
            schematics_1.branchAndMerge(schematics_1.chain([
                schematics_1.mergeWith(templateSource),
            ])),
        ])(host, context);
    };
}
exports["default"] = default_1;
