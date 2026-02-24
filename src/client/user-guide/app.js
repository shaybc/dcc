import { HELP_PAGES_BASE, createHelpPageHref, getRequestedPageId, pagesById } from "./data.js";
import { escapeHtml, markdownToHtml } from "./markdown.js";
import { renderToc } from "./toc.js";

const helpGuideStatus = document.getElementById("helpGuideStatus");
const helpGuideBackLink = document.getElementById("helpGuideBackLink");
const helpGuideToc = document.getElementById("helpGuideToc");
const helpGuidePageLabel = document.getElementById("helpGuidePageLabel");
const helpGuideArticle = document.getElementById("helpGuideArticle");

const pageParams = new URLSearchParams(window.location.search);
const returnTo = pageParams.get("returnTo") || "";
const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";
const encodedSafeReturnTo = encodeURIComponent(safeReturnTo);

if (helpGuideBackLink) {
  helpGuideBackLink.href = safeReturnTo;
}

const helpPageHref = createHelpPageHref(encodedSafeReturnTo);

async function loadPage(pageId) {
  const page = pagesById.get(pageId);
  if (!page) return;

  renderToc(helpGuideToc, pageId, helpPageHref);
  helpGuidePageLabel.textContent = `Viewing: ${page.title}`;
  helpGuideStatus.textContent = `Loaded page ${page.title}`;

  try {
    const response = await fetch(`${HELP_PAGES_BASE}/${page.file}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${page.file}`);
    }

    const markdown = await response.text();
    helpGuideArticle.innerHTML = markdownToHtml(markdown, page.file);
  } catch (error) {
    helpGuideArticle.innerHTML = `<p>Failed to load help page.</p><p><code>${escapeHtml(String(error.message || error))}</code></p>`;
  }
}

loadPage(getRequestedPageId());
