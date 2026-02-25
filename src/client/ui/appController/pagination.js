export function createPaginationController({ paginationContainer, getCurrentCardsPage, setCurrentCardsPage, renderCards }) {
  function createPaginationButton({ label, page, disabled = false, active = false, ariaLabel = "" }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pagination-button${active ? " active" : ""}`;
    button.textContent = label;
    button.disabled = disabled;
    if (ariaLabel) {
      button.setAttribute("aria-label", ariaLabel);
    }
    if (active) {
      button.setAttribute("aria-current", "page");
    }

    if (!disabled) {
      button.addEventListener("click", () => {
        setCurrentCardsPage(page);
        renderCards();
      });
    }
    return button;
  }

  function createPaginationEllipsis() {
    const span = document.createElement("span");
    span.className = "pagination-ellipsis";
    span.setAttribute("aria-hidden", "true");
    span.textContent = "…";
    return span;
  }

  function getVisiblePaginationPages(totalPages, currentPage) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_value, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    return Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  }

  function renderPagination({ totalItems, totalPages }) {
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";
    if (totalItems === 0 || totalPages <= 1) {
      paginationContainer.hidden = true;
      return;
    }

    paginationContainer.hidden = false;
    const currentCardsPage = getCurrentCardsPage();

    paginationContainer.appendChild(createPaginationButton({
      label: "‹",
      page: Math.max(1, currentCardsPage - 1),
      disabled: currentCardsPage <= 1,
      ariaLabel: "Previous page"
    }));

    const visiblePages = getVisiblePaginationPages(totalPages, currentCardsPage);
    visiblePages.forEach((page, index) => {
      const previous = visiblePages[index - 1];
      if (index > 0 && previous && page - previous > 1) {
        paginationContainer.appendChild(createPaginationEllipsis());
      }

      paginationContainer.appendChild(createPaginationButton({
        label: String(page),
        page,
        active: page === currentCardsPage,
        ariaLabel: `Go to page ${page}`
      }));
    });

    paginationContainer.appendChild(createPaginationButton({
      label: "›",
      page: Math.min(totalPages, currentCardsPage + 1),
      disabled: currentCardsPage >= totalPages,
      ariaLabel: "Next page"
    }));
  }

  return { renderPagination };
}
