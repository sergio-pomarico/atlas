// fallow-ignore-file unused-file

import fs from "node:fs/promises";
import path from "node:path";

const escapeHTML = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });

export async function parseHTMLTemplate(
  templateRoute: string,
  data: Record<string, string>
): Promise<string> {
  const route = path.resolve(import.meta.dirname, templateRoute);
  let htmlBody = await fs.readFile(route, "utf-8");
  htmlBody = htmlBody.replace(/{{(.*?)}}/g, (_, varName) => {
    const value = data[varName];
    return value === undefined ? "" : escapeHTML(value);
  });
  return htmlBody;
}
