#!/usr/bin/env node
var _a;
var minimist = require("minimist"), argv = minimist(process.argv.slice(2)), pathUrl = argv._[0] || ".";
var generateDoc = (_a = require("../dist/my-doc.min")) === null || _a === void 0 ? void 0 : _a["default"];
generateDoc(pathUrl);
