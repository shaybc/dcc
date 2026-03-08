import { fetchOnboardingStatus, markOnboardingAsSeen } from "../../api/onboardingApi.js";

const ONBOARDING_STEPS = [
  {
    id: "top-nav",
    selector: "#topNav",
    title: "Top navigation tabs",
    description: "Use these tabs to move between Discover, Activity, Run Agent, Installed, and Favorites.",
  },
  {
    id: "project-select",
    selector: "#devProjectSelect",
    title: "Project selection",
    description: "Pick the active development project here so recommendations and install actions target the right workspace.",
  },
  {
    id: "main-cards",
    selector: "#cards",
    title: "Main hub definition cards",
    description: "This is the main hub: each card represents a definition you can inspect, favorite, edit, or install.",
  },
  {
    id: "create-menu",
    selector: "#newDefinitionButton",
    title: "Create menu",
    description: "Open New to generate a definition or create one from a specific type template.",
  },
  {
    id: "recommendations",
    selector: "#recommendationsToggleButton",
    title: "Recommendations button",
    description: "Toggle project recommendations and trigger AI intent suggestions from this button.",
  },
  {
    id: "main-menu",
    selector: "#hubMenuToggle",
    title: "Main menu",
    description: "Open this menu to access quick controls like User Guide and Settings.",
  },
  {
    id: "filters",
    selector: "#filterButton",
    title: "Filters",
    description: "Use filter controls to narrow definitions by type and quickly focus your search results.",
  },
  {
    id: "user-guide",
    selector: "#installGuideMenuItem",
    title: "Main menu: User Guide",
    description: "Inside the main menu, User Guide opens in-app documentation and walkthroughs.",
    ensureMenuOpen: true,
  },
  {
    id: "settings",
    selector: "#settingsMenuItem",
    title: "Main menu: Settings",
    description: "Use Settings to configure repositories, models, logging, and other hub preferences.",
    ensureMenuOpen: true,
  },
];

function getElement(selector) {
  if (!selector) return null;
  return document.querySelector(selector);
}

function ensureHubMenuOpenIfNeeded() {
  const hubMenu = document.getElementById("hubMenu");
  const toggle = document.getElementById("hubMenuToggle");
  if (!hubMenu || !toggle) return;
  if (hubMenu.hidden) {
    toggle.click();
  }
}

function ensureHubMenuClosed() {
  const hubMenu = document.getElementById("hubMenu");
  const toggle = document.getElementById("hubMenuToggle");
  if (!hubMenu || !toggle) return;
  if (!hubMenu.hidden) {
    toggle.click();
  }
}

function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "onboarding-overlay";

  const spotlight = document.createElement("div");
  spotlight.className = "onboarding-spotlight";

  const popover = document.createElement("section");
  popover.className = "onboarding-popover";

  popover.innerHTML = `
    <p class="onboarding-step" data-onboarding-step></p>
    <h2 class="onboarding-title" data-onboarding-title></h2>
    <p class="onboarding-description" data-onboarding-description></p>
    <div class="onboarding-actions">
      <button type="button" class="btn" data-onboarding-skip>Skip</button>
      <button type="button" class="btn" data-onboarding-next>Next</button>
    </div>
  `;

  overlay.append(spotlight, popover);
  document.body.appendChild(overlay);

  return {
    overlay,
    spotlight,
    popover,
    stepLabel: popover.querySelector("[data-onboarding-step]"),
    title: popover.querySelector("[data-onboarding-title]"),
    description: popover.querySelector("[data-onboarding-description]"),
    skipButton: popover.querySelector("[data-onboarding-skip]"),
    nextButton: popover.querySelector("[data-onboarding-next]"),
  };
}

function positionPopover(popover, targetRect) {
  const margin = 16;
  const popoverRect = popover.getBoundingClientRect();
  const hasSpaceBelow = window.innerHeight - targetRect.bottom > popoverRect.height + margin;
  let top = hasSpaceBelow
    ? targetRect.bottom + margin
    : Math.max(margin, targetRect.top - popoverRect.height - margin);

  let left = targetRect.left;
  if (left + popoverRect.width + margin > window.innerWidth) {
    left = window.innerWidth - popoverRect.width - margin;
  }
  left = Math.max(margin, left);

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
}

function highlightTarget(spotlight, target) {
  const rect = target.getBoundingClientRect();
  const padding = 8;

  spotlight.style.top = `${Math.max(0, Math.round(rect.top - padding))}px`;
  spotlight.style.left = `${Math.max(0, Math.round(rect.left - padding))}px`;
  spotlight.style.width = `${Math.round(rect.width + padding * 2)}px`;
  spotlight.style.height = `${Math.round(rect.height + padding * 2)}px`;

  return rect;
}

export async function maybeRunOnboardingTour(options = {}) {
  const force = options.force === true;
  let status;
  try {
    status = await fetchOnboardingStatus();
  } catch (error) {
    console.warn("Onboarding status check failed", error);
    return;
  }

  if (status?.seen && !force) {
    return;
  }

  const steps = ONBOARDING_STEPS.filter((step) => getElement(step.selector));
  if (!steps.length) {
    return;
  }

  const view = buildOverlay();
  let stepIndex = 0;
  let activeTarget = null;

  const cleanup = async (markSeen) => {
    window.removeEventListener("resize", refresh);
    window.removeEventListener("scroll", refresh, true);
    ensureHubMenuClosed();
    view.overlay.remove();

    if (!markSeen) {
      return;
    }

    try {
      await markOnboardingAsSeen();
    } catch (error) {
      console.warn("Failed to persist onboarding completion", error);
    }
  };

  const refresh = () => {
    if (!activeTarget) return;
    const rect = highlightTarget(view.spotlight, activeTarget);
    positionPopover(view.popover, rect);
    activeTarget.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  };

  const renderStep = () => {
    const step = steps[stepIndex];
    if (step.ensureMenuOpen) {
      ensureHubMenuOpenIfNeeded();
    }

    activeTarget = getElement(step.selector);
    if (!activeTarget) {
      return;
    }

    view.stepLabel.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
    view.title.textContent = step.title;
    view.description.textContent = step.description;
    view.nextButton.textContent = stepIndex === steps.length - 1 ? "Finish" : "Next";

    refresh();
  };

  view.skipButton.addEventListener("click", () => {
    cleanup(true);
  });

  view.nextButton.addEventListener("click", async () => {
    if (stepIndex >= steps.length - 1) {
      await cleanup(true);
      return;
    }
    stepIndex += 1;
    renderStep();
  });

  window.addEventListener("resize", refresh);
  window.addEventListener("scroll", refresh, true);

  renderStep();
}
