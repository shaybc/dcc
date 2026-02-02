import fs from "fs";
import path from "path";

const CATEGORIES = ["prompts", "agents", "workflows", "rules", "context", "mcpServers", "models"];

export function getDefinitionCategories() {
  return [...CATEGORIES];
}

export function loadDefinitionsFromRoot(rootPath, source) {
  if (!rootPath || !fs.existsSync(rootPath)) {
    return [];
  }

  const definitions = [];
  const categories = getDefinitionCategories();

  categories.forEach((type) => {
    const dir = path.join(rootPath, type);
    if (!fs.existsSync(dir)) {
      return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    entries.forEach((fileName) => {
      const filePath = path.join(dir, fileName);
      const content = fs.readFileSync(filePath, "utf-8");
      const name = path.parse(fileName).name;
      definitions.push({
        type,
        name,
        source,
        content
      });
    });
  });

  return definitions;
}
