#!/usr/bin/env node

const minimist = require("minimist"),
  argv = minimist(process.argv.slice(2)),
  pathUrl = argv._[0] || ".";

const generateDoc = require("../dist/my-doc.min")?.default;

generateDoc(pathUrl);
