import fs from "node:fs/promises";
import path from "node:path";

export async function parseHTMLTemplate(
  templateRoute: string,
  data: Record<string, string>
): Promise<string> {
  const route = path.resolve(import.meta.dirname, templateRoute);
  let htmlBody = await fs.readFile(route, "utf-8");
  htmlBody = htmlBody.replace(/{{(.*?)}}/g, (_, varName) => {
    return data[varName] ?? "";
  });
  return htmlBody;
}
