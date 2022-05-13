#!/usr/bin/env node

const minimist = require("minimist"),
  argv = minimist(process.argv.slice(2)),
  pathUrl = argv._[0] || ".",
  isTemplate = Boolean(argv?.t);

const generateDoc = require("../dist/my-doc.min")?.default;

generateDoc(pathUrl, {
  isTemplate,
});
