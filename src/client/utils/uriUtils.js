export function extractDccUriFromDefinitionContent(content, filePath = "") {
  const raw = String(content || "");
  const ext = String(filePath || "").toLowerCase();
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const frontmatterValue = frontmatterMatch[1].match(/^\s*dcc_uri\s*:\s*(.+?)\s*$/m);
    if (frontmatterValue?.[1]) {
      return frontmatterValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
    }
  }

  if (ext.endsWith(".md") || ext.endsWith(".markdown")) return "";

  const yamlValue = raw.match(/^\s*dcc_uri\s*:\s*(.+?)\s*$/m);
  if (!yamlValue?.[1]) return "";
  return yamlValue[1].replace(/^("|')(.*)\1$/, "$2").trim();
}
