import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "@jest/globals";
import { parseHTMLTemplate } from "@shared/utils/email-templates.ts";

describe("parseHTMLTemplate", () => {
  it("escapes interpolated values", async () => {
    const templatePath = path.join(tmpdir(), "atlas-email-template.html");
    await fs.writeFile(templatePath, "<p>{{value}}</p>");
    try {
      await expect(
        parseHTMLTemplate(templatePath, { value: `<script>&"'` })
      ).resolves.toBe("<p>&lt;script&gt;&amp;&quot;&#39;</p>");
    } finally {
      await fs.rm(templatePath, { force: true });
    }
  });
});
