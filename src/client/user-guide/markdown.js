import { HELP_PAGES_BASE } from "./data.js";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(text, baseDir) {
  const escaped = escapeHtml(text);
  const codeSegments = [];
  const withCodePlaceholders = escaped.replace(/(`{1,3})([^\n]+?)\1/g, (_match, _ticks, code) => {
    const placeholder = `%%CODE${codeSegments.length}%%`;
    codeSegments.push(`<code>${code}</code>`);
    return placeholder;
  });

  const withQuotedToken = withCodePlaceholders.replace(/&#39;([^<>&\n]+?)&#39;/g, '<span class="md-inline-quoted">$1</span>');
  const withEmoji = withQuotedToken.replace(/:([a-z0-9_+-]+):/gi, (_match, shortcode) => {
    const emoji = EMOJI_SHORTCODE_MAP.get(String(shortcode || "").toLowerCase());
    return emoji || _match;
  });
  const withUnderline = withEmoji.replace(/__([^_]+)__/g, "<u>$1</u>");
  const withBold = withUnderline.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const withStrikethrough = withItalic.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  const withHighlight = withStrikethrough.replace(/==([^=]+)==/g, "<mark>$1</mark>");
  const withSubscript = withHighlight.replace(/~([^~<>\n]+)~/g, "<sub>$1</sub>");
  const withSuperscript = withSubscript.replace(/\^([^\^<>\n]+)\^/g, "<sup>$1</sup>");
  const withFootnoteRefs = withSuperscript.replace(/\[\^([^\]]+)\]/g, (_match, id) => `<sup id="fnref-${id}"><a href="#fn-${id}">[${id}]</a></sup>`);
  const withLinks = withFootnoteRefs.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const resolved = resolvePath(href, baseDir);
    const safeHref = escapeHtml(resolved);
    return `<a href="${safeHref}" target="_blank" rel="noopener">${label}</a>`;
  });

  return withLinks.replace(/%%CODE(\d+)%%/g, (_match, index) => codeSegments[Number(index)] || "");
}


function slugifyHeadingId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function renderTaskListItem(text, baseDir) {
  const taskMatch = text.match(/^\[(x| )\]\s+(.+)$/i);
  if (!taskMatch) {
    return renderInline(text, baseDir);
  }

  const checked = taskMatch[1].toLowerCase() === "x";
  const label = renderInline(taskMatch[2], baseDir);
  return `<label class="md-task-item"><input type="checkbox" disabled ${checked ? "checked" : ""} /> ${label}</label>`;
}

function renderTable(tableRows, baseDir) {
  if (tableRows.length < 2) return "";
  const parseCells = (line) => line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

  const headerCells = parseCells(tableRows[0]);
  const alignRow = parseCells(tableRows[1]);
  const bodyRows = tableRows.slice(2).map(parseCells);
  const isDivider = alignRow.length === headerCells.length && alignRow.every((cell) => /^:?-{3,}:?$/.test(cell));
  if (!isDivider) return "";

  const thead = `<thead><tr>${headerCells.map((cell) => `<th>${renderInline(cell, baseDir)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((row) => `<tr>${headerCells.map((_, idx) => `<td>${renderInline(row[idx] || "", baseDir)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

const EMOJI_SHORTCODE_MAP = new Map([
  ["joy", "😂"],
  ["smile", "😄"],
  ["rocket", "🚀"],
  ["warning", "⚠️"],
  ["white_check_mark", "✅"],
  ["x", "❌"]
]);

function resolvePath(pathValue, baseDir) {
  if (/^(https?:)?\/\//.test(pathValue) || pathValue.startsWith("/")) {
    return pathValue;
  }
  const normalizedBase = baseDir.endsWith("/") ? baseDir.slice(0, -1) : baseDir;
  return `${normalizedBase}/${pathValue}`;
}

function highlightCode(source, language) {
  const escaped = escapeHtml(source);
  if (!["yaml", "yml", "json"].includes((language || "").toLowerCase())) {
    return escaped;
  }

  return escaped
    .replace(/(^|\s)(true|false|null)(?=\s|$|[\],}])/gm, "$1<span class=\"md-code-boolean\">$2</span>")
    .replace(/(^|\s)(-?\d+(?:\.\d+)?)(?=\s|$|[\],}])/gm, "$1<span class=\"md-code-number\">$2</span>")
    .replace(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g, "<span class=\"md-code-string\">$1</span>")
    .replace(/(^\s*#.*$)/gm, "<span class=\"md-code-comment\">$1</span>")
    .replace(/(^\s*[\w.-]+)(\s*:)/gm, "<span class=\"md-code-key\">$1</span>$2");
}

function renderCodeBlock(codeLines, language) {
  const lang = escapeHtml((language || "").toLowerCase());
  const source = codeLines.join("\n");
  const highlighted = highlightCode(source, language);
  return `<pre class="md-code-block"><code class="language-${lang}">${highlighted}</code></pre>`;
}

function markdownToHtml(markdown, markdownPath) {
  const baseDir = markdownPath.includes("/")
    ? `${HELP_PAGES_BASE}/${markdownPath.slice(0, markdownPath.lastIndexOf("/"))}`
    : HELP_PAGES_BASE;

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraphBuffer = [];
  let listType = null;
  let codeFenceLanguage = null;
  let codeFenceLines = [];
  let blockquoteLines = [];
  let tableRows = [];
  let pendingDefinitionTerm = null;
  const footnotes = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    const paragraphText = paragraphBuffer.join(" ").trim();
    if (paragraphText) {
      html.push(`<p>${renderInline(paragraphText, baseDir)}</p>`);
    }
    paragraphBuffer = [];
  }

  function closeList() {
    if (!listType) return;
    html.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  }

  function flushBlockquote() {
    if (!blockquoteLines.length) return;
    const content = blockquoteLines.map((quoteLine) => renderInline(quoteLine, baseDir)).join("<br />");
    html.push(`<blockquote>${content}</blockquote>`);
    blockquoteLines = [];
  }

  function flushTable() {
    if (!tableRows.length) return;
    const tableHtml = renderTable(tableRows, baseDir);
    if (tableHtml) {
      html.push(tableHtml);
    } else {
      const rowText = tableRows.join(" ").trim();
      if (rowText) {
        html.push(`<p>${renderInline(rowText, baseDir)}</p>`);
      }
    }
    tableRows = [];
  }

  function flushPendingTermAsParagraph() {
    if (!pendingDefinitionTerm) return;
    paragraphBuffer.push(pendingDefinitionTerm);
    pendingDefinitionTerm = null;
  }

  function closeAllOpenBlocks() {
    flushPendingTermAsParagraph();
    flushParagraph();
    closeList();
    flushBlockquote();
    flushTable();
    pendingDefinitionTerm = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (codeFenceLanguage !== null) {
      if (line.startsWith("```")) {
        html.push(renderCodeBlock(codeFenceLines, codeFenceLanguage));
        codeFenceLanguage = null;
        codeFenceLines = [];
      } else {
        codeFenceLines.push(rawLine);
      }
      continue;
    }

    const footnoteDefinitionMatch = line.match(/^\[\^([^\]]+)\]:\s+(.+)$/);
    if (footnoteDefinitionMatch) {
      closeAllOpenBlocks();
      footnotes.push({ id: footnoteDefinitionMatch[1], text: footnoteDefinitionMatch[2] });
      continue;
    }

    const codeFenceMatch = line.match(/^```\s*([\w-]+)?\s*$/);
    if (codeFenceMatch) {
      closeAllOpenBlocks();
      codeFenceLanguage = codeFenceMatch[1] || "";
      codeFenceLines = [];
      continue;
    }

    const tableCandidate = rawLine.replace(/`{1,3}[^`\n]+`{1,3}/g, "");
    const tableMatch = tableCandidate.includes("|")
      && /^\s*\|?.+\|.+\|?\s*$/.test(tableCandidate)
      && !/^\s*[-*+]\s+/.test(rawLine)
      && !/^\s*\d+\.\s+/.test(rawLine);
    if (tableMatch) {
      flushPendingTermAsParagraph();
      flushParagraph();
      closeList();
      flushBlockquote();
      tableRows.push(rawLine);
      continue;
    }
    flushTable();

    const blockquoteMatch = rawLine.match(/^\s*>\s?(.*)$/);
    if (blockquoteMatch) {
      flushPendingTermAsParagraph();
      flushParagraph();
      closeList();
      blockquoteLines.push(blockquoteMatch[1]);
      continue;
    }
    flushBlockquote();

    const definitionMatch = rawLine.match(/^\s*:\s+(.+)$/);
    if (definitionMatch && pendingDefinitionTerm) {
      flushParagraph();
      closeList();
      flushBlockquote();
      flushTable();
      html.push(`<dl><dt>${renderInline(pendingDefinitionTerm, baseDir)}</dt><dd>${renderInline(definitionMatch[1], baseDir)}</dd></dl>`);
      pendingDefinitionTerm = null;
      continue;
    }

    if (!line) {
      closeAllOpenBlocks();
      continue;
    }

    flushPendingTermAsParagraph();

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeAllOpenBlocks();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const headingIdMatch = headingText.match(/^(.*)\s+\{#([a-zA-Z][\w-]*)\}\s*$/);
      const headingLabel = headingIdMatch ? headingIdMatch[1].trim() : headingText;
      const headingId = headingIdMatch ? headingIdMatch[2] : slugifyHeadingId(headingLabel);
      const idAttribute = headingId ? ` id="${escapeHtml(headingId)}"` : "";
      html.push(`<h${level}${idAttribute}>${renderInline(headingLabel, baseDir)}</h${level}>`);
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      closeAllOpenBlocks();
      const alt = escapeHtml(imageMatch[1]);
      const src = escapeHtml(resolvePath(imageMatch[2], baseDir));
      html.push(`
        <figure class="help-guide-figure">
          <img src="${src}" alt="${alt}" loading="lazy" />
          <figcaption>${alt}</figcaption>
        </figure>
      `);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      flushBlockquote();
      flushTable();
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      pendingDefinitionTerm = null;
      html.push(`<li>${renderInline(orderedMatch[1], baseDir)}</li>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushBlockquote();
      flushTable();
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      pendingDefinitionTerm = null;
      html.push(`<li>${renderTaskListItem(unorderedMatch[1], baseDir)}</li>`);
      continue;
    }

    if (line === "---") {
      closeAllOpenBlocks();
      html.push("<hr />");
      continue;
    }

    closeList();
    flushBlockquote();
    flushTable();

    if (!paragraphBuffer.length && !pendingDefinitionTerm) {
      pendingDefinitionTerm = line;
    } else {
      paragraphBuffer.push(line);
    }
  }

  closeAllOpenBlocks();
  if (codeFenceLanguage !== null) {
    html.push(renderCodeBlock(codeFenceLines, codeFenceLanguage));
  }

  if (footnotes.length) {
    html.push('<section class="md-footnotes"><hr /><ol>');
    for (const note of footnotes) {
      const safeId = escapeHtml(note.id);
      html.push(`<li id="fn-${safeId}">${renderInline(note.text, baseDir)} <a href="#fnref-${safeId}" aria-label="Back to content">↩</a></li>`);
    }
    html.push("</ol></section>");
  }

  return html.join("\n");
}

export { escapeHtml, markdownToHtml };
