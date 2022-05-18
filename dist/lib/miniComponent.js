"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMiniComponentDoc = void 0;
var os_1 = require("os");
var path_1 = require("path");
var typescript_1 = require("typescript");
var fs_1 = require("fs");
var colors_1 = require("colors");
var tsdoc = require("@microsoft/tsdoc");
var tsdoc_1 = require("@microsoft/tsdoc");
/**
 * 判断哪些注释需要生成文档
 */
function isDeclarationKind(kind) {
    return (kind === typescript_1.default.SyntaxKind.ArrowFunction ||
        kind === typescript_1.default.SyntaxKind.BindingElement ||
        kind === typescript_1.default.SyntaxKind.ClassDeclaration ||
        kind === typescript_1.default.SyntaxKind.ClassExpression ||
        kind === typescript_1.default.SyntaxKind.Constructor ||
        kind === typescript_1.default.SyntaxKind.EnumDeclaration ||
        kind === typescript_1.default.SyntaxKind.EnumMember ||
        kind === typescript_1.default.SyntaxKind.ExportSpecifier ||
        kind === typescript_1.default.SyntaxKind.FunctionDeclaration ||
        kind === typescript_1.default.SyntaxKind.FunctionExpression ||
        kind === typescript_1.default.SyntaxKind.GetAccessor ||
        kind === typescript_1.default.SyntaxKind.ImportClause ||
        kind === typescript_1.default.SyntaxKind.ImportEqualsDeclaration ||
        kind === typescript_1.default.SyntaxKind.ImportSpecifier ||
        kind === typescript_1.default.SyntaxKind.InterfaceDeclaration ||
        kind === typescript_1.default.SyntaxKind.JsxAttribute ||
        kind === typescript_1.default.SyntaxKind.MethodDeclaration ||
        kind === typescript_1.default.SyntaxKind.MethodSignature ||
        kind === typescript_1.default.SyntaxKind.ModuleDeclaration ||
        kind === typescript_1.default.SyntaxKind.NamespaceExportDeclaration ||
        kind === typescript_1.default.SyntaxKind.NamespaceImport ||
        kind === typescript_1.default.SyntaxKind.Parameter ||
        kind === typescript_1.default.SyntaxKind.PropertyAssignment ||
        kind === typescript_1.default.SyntaxKind.PropertyDeclaration ||
        kind === typescript_1.default.SyntaxKind.PropertySignature ||
        kind === typescript_1.default.SyntaxKind.SetAccessor ||
        kind === typescript_1.default.SyntaxKind.ShorthandPropertyAssignment ||
        kind === typescript_1.default.SyntaxKind.TypeAliasDeclaration ||
        kind === typescript_1.default.SyntaxKind.TypeParameter ||
        kind === typescript_1.default.SyntaxKind.VariableDeclaration ||
        kind === typescript_1.default.SyntaxKind.JSDocTypedefTag ||
        kind === typescript_1.default.SyntaxKind.JSDocCallbackTag ||
        kind === typescript_1.default.SyntaxKind.JSDocPropertyTag ||
        kind === typescript_1.default.SyntaxKind.CallExpression);
}
/**
 * 获取多行注释的AST
 */
function getJSDocCommentRanges(node, text) {
    var commentRanges = [];
    switch (node.kind) {
        case typescript_1.default.SyntaxKind.CallExpression:
        case typescript_1.default.SyntaxKind.Parameter:
        case typescript_1.default.SyntaxKind.TypeParameter:
        case typescript_1.default.SyntaxKind.FunctionExpression:
        case typescript_1.default.SyntaxKind.ArrowFunction:
        case typescript_1.default.SyntaxKind.ParenthesizedExpression:
            commentRanges.push.apply(commentRanges, (typescript_1.default.getTrailingCommentRanges(text, node.pos) || []));
            break;
    }
    commentRanges.push.apply(commentRanges, (typescript_1.default.getLeadingCommentRanges(text, node.pos) || []));
    // 如果是'/**'开头，但不是'/**/'的注释，返回true
    return commentRanges.filter(function (comment) {
        return text.charCodeAt(comment.pos + 1) ===
            0x2a /* ts.CharacterCodes.asterisk */ &&
            text.charCodeAt(comment.pos + 2) ===
                0x2a /* ts.CharacterCodes.asterisk */ &&
            text.charCodeAt(comment.pos + 3) !== 0x2f;
    } /* ts.CharacterCodes.slash */);
}
/**
 * 遍历AST寻找注释
 * @param node
 * @param indent
 * @param foundComments
 * @returns
 */
function walkCompilerAstAndFindComments(node, indent, foundComments) {
    // let foundCommentsSuffix: string = "";
    var buffer = node.getSourceFile().getFullText();
    // 判断解析哪些部分的注释
    if (isDeclarationKind(node.kind)) {
        // 找到 "/** */" 风格的多行注释.
        var comments = getJSDocCommentRanges(node, buffer);
        if (comments.length > 0) {
            // if (comments.length === 1) {
            //   foundCommentsSuffix = colors.cyan(`  (FOUND 1 COMMENT)`);
            // } else {
            //   foundCommentsSuffix = colors.cyan(
            //     `  (FOUND ${comments.length} COMMENTS)`,
            //   );
            // }
            for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
                var comment = comments_1[_i];
                foundComments.push({
                    compilerNode: node,
                    textRange: tsdoc.TextRange.fromStringRange(buffer, comment.pos, comment.end),
                });
            }
        }
    }
    // console.log(`${indent}- ${ts.SyntaxKind[node.kind]}${foundCommentsSuffix}`);
    return node.forEachChild(function (child) {
        return walkCompilerAstAndFindComments(child, indent + "  ", foundComments);
    });
}
/**
 * 生成文档
 */
function generateMiniComponentDoc(pathUrl) {
    console.log(colors_1.default.yellow("*** 正在生成文档 ***") + os_1.default.EOL);
    var dest = path_1.default.join(path_1.default.dirname(pathUrl), "README.md");
    var inputFilename = path_1.default.resolve(pathUrl);
    var compilerOptions = {
        target: typescript_1.default.ScriptTarget.ES5,
    };
    var program = typescript_1.default.createProgram([inputFilename], compilerOptions);
    var sourceFile = program.getSourceFile(inputFilename);
    if (!sourceFile) {
        throw new Error("Error retrieving source file");
    }
    // 编译TS代码
    program.getSemanticDiagnostics();
    var foundComments = [];
    var properties = [];
    var events = [];
    var summary = "";
    walkCompilerAstAndFindComments(sourceFile, "", foundComments);
    if (foundComments.length === 0) {
        console.log(colors_1.default.red("Error: No code comments were found in the input file"));
        return;
    }
    foundComments.forEach(function (item) {
        var _a, _b, _c;
        var tsdocParser = new tsdoc_1.TSDocParser();
        var parserContext = tsdocParser.parseRange(item.textRange);
        var isType = (_a = parserContext.lines[0]) === null || _a === void 0 ? void 0 : _a.toString().startsWith("@property");
        var isEvent = (_b = parserContext.lines[0]) === null || _b === void 0 ? void 0 : _b.toString().startsWith("@event");
        if (isType) {
            properties.push(generateProperty(parserContext.lines));
        }
        if (isEvent) {
            events.push(generateEvent(parserContext.lines));
        }
        if (!isType && !isEvent && !summary) {
            summary = (_c = parserContext.lines[0]) === null || _c === void 0 ? void 0 : _c.toString();
        }
    });
    generateReadme({
        title: path_1.default.basename(path_1.default.dirname(pathUrl)),
        events: events,
        properties: properties,
        summary: summary,
    }, {
        dest: dest,
    });
}
exports.generateMiniComponentDoc = generateMiniComponentDoc;
function generateProperty(lines) {
    var property = {
        name: "",
        isRequire: false,
        typeName: "",
        typeFile: "",
        description: "",
    };
    return lines
        .filter(function (line) { return !line.isEmpty(); })
        .reduce(function (pre, line) {
        var lineStr = line.toString();
        if (lineStr.startsWith("@property")) {
            pre.name = lineStr.replace("@property", "").trim();
        }
        if (lineStr.startsWith("@requires")) {
            pre.isRequire = true;
        }
        if (lineStr.startsWith("@description")) {
            pre.description = lineStr.replace("@description", "").trim();
        }
        if (lineStr.startsWith("@type")) {
            var typeData = lineStr
                .replace("@type", "")
                .trim()
                .replace(" {@link ", "@@@@")
                .replace("}", "")
                .split("@@@@")
                .filter(function (str) { return str; });
            pre.typeName = typeData[0];
            pre.typeFile = typeData[1];
        }
        return pre;
    }, property);
}
function generateEvent(lines) {
    var event = {
        name: "",
        typeName: "",
        typeFile: "",
        description: "",
    };
    return lines
        .filter(function (line) { return !line.isEmpty(); })
        .reduce(function (pre, line) {
        var lineStr = line.toString();
        if (lineStr.startsWith("@event")) {
            pre.name = lineStr.replace("@event", "").trim();
        }
        if (lineStr.startsWith("@description")) {
            pre.description = lineStr.replace("@description", "").trim();
        }
        if (lineStr.startsWith("@detail")) {
            var typeData = lineStr
                .replace("@detail", "")
                .trim()
                .replace(" {@link ", "@@@@")
                .replace("}", "")
                .split("@@@@")
                .filter(function (str) { return str; });
            pre.typeName = typeData[0];
            pre.typeFile = typeData[1] || "";
        }
        return pre;
    }, event);
}
function generateReadme(content, options) {
    var _a, _b, _c, _d;
    var result = ["# ".concat(content.title || "", "\n\n")];
    if (content.summary) {
        result.push(content.summary || "");
        result.push("\n\n");
    }
    result.push("## \u5C5E\u6027 - properties\n\n");
    result.push("| \u5C5E\u6027\u540D | \u662F\u5426\u5FC5\u9700 | \u7C7B\u578B\u540D | \u7C7B\u578B\u58F0\u660E\u6587\u4EF6| \u63CF\u8FF0 |\n");
    result.push("| ---- | ---- | ---- | ---- | ---- |\n");
    if (!(content === null || content === void 0 ? void 0 : content.properties) || ((_a = content === null || content === void 0 ? void 0 : content.properties) === null || _a === void 0 ? void 0 : _a.length) === 0) {
        result.push("| \u65E0 | \u65E0 | \u65E0 | \u65E0 | \u65E0 |\n");
    }
    (_b = content === null || content === void 0 ? void 0 : content.properties) === null || _b === void 0 ? void 0 : _b.forEach(function (property) {
        result.push("| ".concat(property.name, " | ").concat(property.isRequire, " | ").concat(property.typeName, " | ").concat(property.typeFile ? "[\u70B9\u51FB\u67E5\u770B](".concat(property.typeFile, ")") : "无", " | ").concat(property.description, " |\n"));
    });
    result.push("\n");
    result.push("## \u4E8B\u4EF6 - event\n\n");
    result.push("\u7EC4\u4EF6\u89E6\u53D1\u7684\u4E8B\u4EF6\uFF0C\u5C0F\u7A0B\u5E8F\u7EC4\u4EF6\u662F\u901A\u8FC7 triggerEvent \u65B9\u6CD5\u89E6\u53D1\u4E8B\u4EF6\n\n");
    result.push("| \u4E8B\u4EF6\u540D | \u4E8B\u4EF6\u8FD4\u56DE\u503C\u7C7B\u578B\u540D | \u7C7B\u578B\u58F0\u660E\u6587\u4EF6 | \u63CF\u8FF0|\n");
    result.push("| ---- | ---- | ---- | ---- |\n");
    if (!(content === null || content === void 0 ? void 0 : content.events) || ((_c = content === null || content === void 0 ? void 0 : content.events) === null || _c === void 0 ? void 0 : _c.length) === 0) {
        result.push("| \u65E0 | \u65E0 | \u65E0 | \u65E0 |\n");
    }
    (_d = content === null || content === void 0 ? void 0 : content.events) === null || _d === void 0 ? void 0 : _d.forEach(function (event) {
        result.push("| ".concat(event.name, " | ").concat(event.typeName, " | ").concat(event.typeFile ? "[\u70B9\u51FB\u67E5\u770B](".concat(event.typeFile, ")") : "无", " | ").concat(event.description, " |\n"));
    });
    fs_1.default.writeFileSync(options.dest || "./README.md", result.join(""));
}
//# sourceMappingURL=miniComponent.js.map