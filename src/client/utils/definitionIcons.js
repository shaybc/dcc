const ICON_SVG_BY_KEY = {
  prompt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H7l-4 3 1.2-4.6A6 6 0 0 1 3 15a6 6 0 0 1 6-6h8a4 4 0 0 1 4 4z"></path></svg>',
  model: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>',
  mcpserver: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="2"></rect><rect x="3" y="9" width="18" height="6" rx="2"></rect><rect x="3" y="15" width="18" height="6" rx="2"></rect></svg>',
  rule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3h8"></path><path d="M6 7h12"></path><path d="M8 11h8"></path><path d="M10 15h4"></path><path d="M12 19h0"></path></svg>',
  agent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>',
  workflow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h8"></path><path d="M4 12h12"></path><path d="M4 18h16"></path><circle cx="15" cy="6" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="21" cy="18" r="1.5"></circle></svg>',
  context: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.35-7-10a7 7 0 1 1 14 0c0 5.65-7 10-7 10z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><path d="M15 4v4h4"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>',
  config: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13 11 22l-9-9V4h9z"></path><circle cx="7" cy="9" r="1.5"></circle></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>',
  org: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 21v-6h6v6"></path></svg>'
};

const DEFAULT_FALLBACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"></circle></svg>';
const FILTER_FALLBACK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><path d="M8 12h8"></path><path d="M12 8v8"></path></svg>';

function canonicalizeIconType(type) {
  const normalized = String(type || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();

  if (!normalized) return "";
  if (normalized === "prompts") return "prompt";
  if (normalized === "models") return "model";
  if (normalized === "rules") return "rule";
  if (normalized === "agents") return "agent";
  if (normalized === "workflows") return "workflow";
  if (normalized === "docs") return "doc";
  if (normalized === "configs") return "config";
  if (normalized === "tags") return "tag";
  if (normalized === "users") return "user";
  if (normalized === "orgs") return "org";
  if (normalized === "mcpserver" || normalized === "mcpservers") return "mcpserver";

  return normalized;
}

export function definitionIconSvg(type, { fallback = "default" } = {}) {
  const key = canonicalizeIconType(type);
  const icon = ICON_SVG_BY_KEY[key];
  if (icon) return icon;
  return fallback === "filter" ? FILTER_FALLBACK_SVG : DEFAULT_FALLBACK_SVG;
}
