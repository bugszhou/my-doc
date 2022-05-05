import path from "path";
import normalizePath from "normalize-path";
import fs from "fs-extra";

export default async function generateDoc(docPath: string) {
  const templatePath = path.join(__dirname, "../template/README.md");

  try {
    await fs.copyFile(templatePath, path.join(generatePathUrl(docPath), "README.md"));

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
