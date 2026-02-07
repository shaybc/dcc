import matter from "gray-matter";
import YAML from "yaml";

function bumpVersionValue(rawVersion) {
  const value = Number.parseFloat(rawVersion ?? "0");
  if (!Number.isFinite(value)) {
    return "0.1";
  }
  const bumped = (Math.round(value * 10) + 1) / 10;
  return bumped.toFixed(1);
}

export function bumpVersionInContent(content = "", format = "yaml") {
  if (format === "markdown") {
    const parsed = matter(content || "");
    parsed.data.version = bumpVersionValue(parsed.data.version);
    return matter.stringify(parsed.content, parsed.data);
  }

  const parsedYaml = YAML.parse(content || "") || {};
  parsedYaml.version = bumpVersionValue(parsedYaml.version);
  return YAML.stringify(parsedYaml);
}
