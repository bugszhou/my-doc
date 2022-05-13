import os from "os";
import path from "path";
import ts from "typescript";
import fs from "fs";
import colors from "colors";
import * as tsdoc from "@microsoft/tsdoc";
import { ParserContext, TSDocParser } from "@microsoft/tsdoc";

/**
 * 判断哪些注释需要生成文档
 */
function isDeclarationKind(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.ArrowFunction ||
    kind === ts.SyntaxKind.BindingElement ||
    kind === ts.SyntaxKind.ClassDeclaration ||
    kind === ts.SyntaxKind.ClassExpression ||
    kind === ts.SyntaxKind.Constructor ||
    kind === ts.SyntaxKind.EnumDeclaration ||
    kind === ts.SyntaxKind.EnumMember ||
    kind === ts.SyntaxKind.ExportSpecifier ||
    kind === ts.SyntaxKind.FunctionDeclaration ||
    kind === ts.SyntaxKind.FunctionExpression ||
    kind === ts.SyntaxKind.GetAccessor ||
    kind === ts.SyntaxKind.ImportClause ||
    kind === ts.SyntaxKind.ImportEqualsDeclaration ||
    kind === ts.SyntaxKind.ImportSpecifier ||
    kind === ts.SyntaxKind.InterfaceDeclaration ||
    kind === ts.SyntaxKind.JsxAttribute ||
    kind === ts.SyntaxKind.MethodDeclaration ||
    kind === ts.SyntaxKind.MethodSignature ||
    kind === ts.SyntaxKind.ModuleDeclaration ||
    kind === ts.SyntaxKind.NamespaceExportDeclaration ||
    kind === ts.SyntaxKind.NamespaceImport ||
    kind === ts.SyntaxKind.Parameter ||
    kind === ts.SyntaxKind.PropertyAssignment ||
    kind === ts.SyntaxKind.PropertyDeclaration ||
    kind === ts.SyntaxKind.PropertySignature ||
    kind === ts.SyntaxKind.SetAccessor ||
    kind === ts.SyntaxKind.ShorthandPropertyAssignment ||
    kind === ts.SyntaxKind.TypeAliasDeclaration ||
    kind === ts.SyntaxKind.TypeParameter ||
    kind === ts.SyntaxKind.VariableDeclaration ||
    kind === ts.SyntaxKind.JSDocTypedefTag ||
    kind === ts.SyntaxKind.JSDocCallbackTag ||
    kind === ts.SyntaxKind.JSDocPropertyTag ||
    kind === ts.SyntaxKind.CallExpression
  );
}

/**
 * 获取多行注释的AST
 */
function getJSDocCommentRanges(node: ts.Node, text: string): ts.CommentRange[] {
  const commentRanges: ts.CommentRange[] = [];

  switch (node.kind) {
    case ts.SyntaxKind.CallExpression:
    case ts.SyntaxKind.Parameter:
    case ts.SyntaxKind.TypeParameter:
    case ts.SyntaxKind.FunctionExpression:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.ParenthesizedExpression:
      commentRanges.push(
        ...(ts.getTrailingCommentRanges(text, node.pos) || []),
      );
      break;
  }
  commentRanges.push(...(ts.getLeadingCommentRanges(text, node.pos) || []));

  // 如果是'/**'开头，但不是'/**/'的注释，返回true
  return commentRanges.filter(
    (comment) =>
      text.charCodeAt(comment.pos + 1) ===
        0x2a /* ts.CharacterCodes.asterisk */ &&
      text.charCodeAt(comment.pos + 2) ===
        0x2a /* ts.CharacterCodes.asterisk */ &&
      text.charCodeAt(comment.pos + 3) !== 0x2f /* ts.CharacterCodes.slash */,
  );
}

/**
 * 缓存找到的注释
 */
interface IFoundComment {
  compilerNode: ts.Node;
  textRange: tsdoc.TextRange;
}

/**
 * 遍历AST寻找注释
 * @param node
 * @param indent
 * @param foundComments
 * @returns
 */
function walkCompilerAstAndFindComments(
  node: ts.Node,
  indent: string,
  foundComments: IFoundComment[],
): void {
  // let foundCommentsSuffix: string = "";
  const buffer: string = node.getSourceFile().getFullText();

  // 判断解析哪些部分的注释
  if (isDeclarationKind(node.kind)) {
    // 找到 "/** */" 风格的多行注释.
    const comments: ts.CommentRange[] = getJSDocCommentRanges(node, buffer);

    if (comments.length > 0) {
      // if (comments.length === 1) {
      //   foundCommentsSuffix = colors.cyan(`  (FOUND 1 COMMENT)`);
      // } else {
      //   foundCommentsSuffix = colors.cyan(
      //     `  (FOUND ${comments.length} COMMENTS)`,
      //   );
      // }

      for (const comment of comments) {
        foundComments.push({
          compilerNode: node,
          textRange: tsdoc.TextRange.fromStringRange(
            buffer,
            comment.pos,
            comment.end,
          ),
        });
      }
    }
  }

  // console.log(`${indent}- ${ts.SyntaxKind[node.kind]}${foundCommentsSuffix}`);

  return node.forEachChild((child) =>
    walkCompilerAstAndFindComments(child, indent + "  ", foundComments),
  );
}

interface IProperty {
  name: string;
  isRequire: boolean;
  typeName: string;
  typeFile: string;
  description: string;
}

interface IEvent {
  name: string;
  typeName: string;
  typeFile: string;
  description: string;
}

/**
 * 生成文档
 */
export function generateMiniComponentDoc(pathUrl: string): void {
  console.log(colors.yellow("*** 正在生成文档 ***") + os.EOL);
  const dest = path.join(path.dirname(pathUrl), "README.md");

  const inputFilename: string = path.resolve(pathUrl);
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES5,
  };

  const program: ts.Program = ts.createProgram(
    [inputFilename],
    compilerOptions,
  );

  const sourceFile: ts.SourceFile | undefined =
    program.getSourceFile(inputFilename);

  if (!sourceFile) {
    throw new Error("Error retrieving source file");
  }

  // 编译TS代码
  program.getSemanticDiagnostics();

  const foundComments: IFoundComment[] = [];

  const properties: IProperty[] = [];
  const events: IEvent[] = [];
  let summary = "";

  walkCompilerAstAndFindComments(sourceFile, "", foundComments);

  if (foundComments.length === 0) {
    console.log(
      colors.red("Error: No code comments were found in the input file"),
    );
    return;
  }

  foundComments.forEach((item) => {
    const tsdocParser: TSDocParser = new TSDocParser();
    const parserContext: ParserContext = tsdocParser.parseRange(item.textRange);

    const isType = parserContext.lines[0]?.toString().startsWith("@property");
    const isEvent = parserContext.lines[0]?.toString().startsWith("@event");

    if (isType) {
      properties.push(generateProperty(parserContext.lines));
    }

    if (isEvent) {
      events.push(generateEvent(parserContext.lines));
    }

    if (!isType && !isEvent) {
      summary = parserContext.lines[0]?.toString();
    }
  });

  generateReadme(
    {
      title: path.basename(path.dirname(pathUrl)),
      events,
      properties,
      summary,
    },
    {
      dest,
    },
  );
}

function generateProperty(lines: tsdoc.TextRange[]) {
  const property = {
    name: "",
    isRequire: false,
    typeName: "",
    typeFile: "",
    description: "",
  };

  return lines
    .filter((line) => !line.isEmpty())
    .reduce<IProperty>((pre, line) => {
      const lineStr: string = line.toString();

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
        const typeData = lineStr
          .replace("@type", "")
          .trim()
          .replace("{@link", "")
          .replace("}", "")
          .split(" ")
          .filter((str) => str);
        pre.typeName = typeData[0];
        pre.typeFile = typeData[1];
      }

      return pre;
    }, property);
}

function generateEvent(lines: tsdoc.TextRange[]) {
  const event = {
    name: "",
    typeName: "",
    typeFile: "",
    description: "",
  };

  return lines
    .filter((line) => !line.isEmpty())
    .reduce<IEvent>((pre, line) => {
      const lineStr: string = line.toString();

      if (lineStr.startsWith("@event")) {
        pre.name = lineStr.replace("@event", "").trim();
      }

      if (lineStr.startsWith("@description")) {
        pre.description = lineStr.replace("@description", "").trim();
      }

      if (lineStr.startsWith("@detail")) {
        const typeData = lineStr
          .replace("@detail", "")
          .trim()
          .replace("{@link", "")
          .replace("}", "")
          .split(" ")
          .filter((str) => str);
        pre.typeName = typeData[0];
        pre.typeFile = typeData[1] || "";
        console.log(pre);
      }

      return pre;
    }, event);
}

interface IGenerateReadmeContent {
  title: string;
  summary: string;
  properties: IProperty[];
  events: IEvent[];
}

interface IGenerateReadmeOptions {
  dest: string;
}
function generateReadme(
  content: IGenerateReadmeContent,
  options: IGenerateReadmeOptions,
) {
  const result: string[] = [`# ${content.title || ""}\n\n`];
  result.push(content.summary || "");
  result.push("\n\n");

  result.push(`## 属性 - properties\n\n`);
  result.push(`| 属性名 | 是否必需 | 类型名 | 类型声明文件| 描述 |\n`);
  result.push(`| ---- | ---- | ---- | ---- | ---- |\n`);

  if (!content?.properties || content?.properties?.length === 0) {
    result.push(`| 无 | 无 | 无 | 无 | 无 |\n`);
  }

  content?.properties?.forEach((property) => {
    result.push(
      `| ${property.name} | ${property.isRequire} | ${property.typeName} | ${
        property.typeFile ? `[点击查看](event.typeFile)` : "无"
      } | ${property.description} |\n`,
    );
  });

  result.push("\n");
  result.push(`## 事件 - event\n\n`);
  result.push(`组件触发的事件，小程序组件是通过 triggerEvent 方法触发事件\n\n`);

  result.push(`| 事件名 | 事件返回值类型名 | 类型声明文件 | 描述|\n`);
  result.push(`| ---- | ---- | ---- | ---- |\n`);

  if (!content?.events || content?.events?.length === 0) {
    result.push(`| 无 | 无 | 无 | 无 |\n`);
  }

  content?.events?.forEach((event) => {
    result.push(
      `| ${event.name} | ${event.typeName} | ${
        event.typeFile ? `[点击查看](event.typeFile)` : "无"
      } | ${event.description} |\n`,
    );
  });

  fs.writeFileSync(options.dest || "./README.md", result.join(""));
}
