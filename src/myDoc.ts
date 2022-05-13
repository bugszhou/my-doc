import path from "path";
import normalizePath from "normalize-path";
import fs from "fs-extra";
import { generateMiniComponentDoc } from "./lib/miniComponent";

interface IOptions {
  isTemplate: boolean;
}

export default async function generateDoc(docPath: string, options?: IOptions) {
  const templatePath = path.join(__dirname, "../template/README.md");
  console.log("文档生成中......");

  try {
    if (options?.isTemplate) {
      await fs.copyFile(
        templatePath,
        path.join(generatePathUrl(docPath), "README.md"),
      );
      console.log("文档生成成功！");
      return;
    }

    await generateMiniComponentDoc(path.join(generatePathUrl(docPath), "index.ts"));

    console.log("文档生成成功！");
  } catch (e) {
    console.log(e);
    console.log("文档生成失败！");
  }
}

function generatePathUrl(pathUrl = "") {
  let fileUrl = normalizePath(String(pathUrl).trim());
  if (fileUrl === ".") {
    fileUrl = process.cwd();
  }

  if (fileUrl.startsWith("./")) {
    fileUrl = path.join(process.cwd(), fileUrl);
  }

  return fileUrl;
}
