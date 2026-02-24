import { tocSections } from "./data.js";

function renderToc(helpGuideToc, activePageId, helpPageHref) {
  helpGuideToc.innerHTML = `
    <h2>Help Pages</h2>
    ${tocSections.map((section) => {
      const sectionHasActivePage = section.pages.some((page) => page.id === activePageId || (Array.isArray(page.children) && page.children.some((child) => child.id === activePageId)));
      return `
      <section class="toc-section ${sectionHasActivePage ? "" : "is-collapsed"}">
        <button type="button" class="toc-section-header" aria-expanded="${sectionHasActivePage ? "true" : "false"}">
          <h3 class="toc-section-title">${section.sectionTitle}</h3>
          <span class="toc-section-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="toc-section-body">
          <div class="toc-links">
          ${section.pages.map((page) => {
            const activeClass = page.id === activePageId ? "is-active" : "";
            const childLinks = Array.isArray(page.children) && page.children.length
              ? `<div class="toc-sub-links">${page.children.map((child) => {
                const childActiveClass = child.id === activePageId ? "is-active" : "";
                return `<a class="toc-link toc-sub-link ${childActiveClass}" href="${helpPageHref(child.id)}">${child.title}</a>`;
              }).join("")}</div>`
              : "";
            return `<a class="toc-link ${activeClass}" href="${helpPageHref(page.id)}">${page.title}</a>${childLinks}`;
          }).join("")}
          </div>
        </div>
      </section>
    `;
    }).join("")}
  `;

  helpGuideToc.querySelectorAll(".toc-section-header").forEach((header) => {
    header.addEventListener("click", () => {
      const section = header.closest(".toc-section");
      if (!section) return;
      section.classList.toggle("is-collapsed");
      const expanded = !section.classList.contains("is-collapsed");
      header.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
  });
}

export { renderToc };
