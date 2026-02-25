export function createPaginationController({ paginationContainer, onPageChange }) {
  function createPaginationButton({ label, page, disabled = false, active = false, ariaLabel = "" }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pagination-button";
    if (active) button.classList.add("active");
    button.textContent = label;
    button.disabled = disabled;
    button.setAttribute("aria-label", ariaLabel || `Page ${label}`);
    button.addEventListener("click", () => {
      if (disabled || active) return;
      onPageChange(page);
    });
    return button;
  }

  function createPaginationEllipsis() {
    const span = document.createElement("span");
    span.className = "pagination-ellipsis";
    span.textContent = "…";
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function getVisiblePaginationPages(totalPages, currentPage) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_unused, index) => index + 1);
    }
    if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", totalPages];
    if (currentPage >= totalPages - 3) return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
  }

  function renderPagination({ totalItems, totalPages, currentPage }) {
    if (!paginationContainer) return;
    paginationContainer.innerHTML = "";
    if (!totalItems || totalPages <= 1) {
      paginationContainer.hidden = true;
      return;
    }

    paginationContainer.hidden = false;
    paginationContainer.appendChild(
      createPaginationButton({
        label: "‹",
        page: currentPage - 1,
        disabled: currentPage <= 1,
        ariaLabel: "Previous page",
      })
    );

    const pages = getVisiblePaginationPages(totalPages, currentPage);
    pages.forEach((page) => {
      if (page === "ellipsis") {
        paginationContainer.appendChild(createPaginationEllipsis());
      } else {
        paginationContainer.appendChild(
          createPaginationButton({
            label: String(page),
            page,
            active: page === currentPage,
            ariaLabel: `Page ${page}`,
          })
        );
      }
    });

    paginationContainer.appendChild(
      createPaginationButton({
        label: "›",
        page: currentPage + 1,
        disabled: currentPage >= totalPages,
        ariaLabel: "Next page",
      })
    );
  }

  return { createPaginationButton, createPaginationEllipsis, getVisiblePaginationPages, renderPagination };
}
