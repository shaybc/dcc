import { isAgentEnabled } from "../runtimeConfig.js";

const HELP_PAGES_BASE = "/help/user-guide/pages";

const AGENT_PAGE_IDS = new Set([
  "activity-page",
  "run-agent-page",
  "definition-details-actions-test-schema-agent",
]);

const tocSections = [
  {
    sectionTitle: "Start Here",
    pages: [
      {
        id: "what-is-continue-and-dcc",
        title: "What is Continue.dev and DCC",
        file: "what-is-continue-and-dcc.md"
      }
    ]
  },
  {
    sectionTitle: "Install",
    pages: [
      {
        id: "install-continue-extension-to-ide",
        title: "Install Continue Extension to IDE",
        file: "install-continue-extension-to-ide.md"
      }
    ]
  },
  {
    sectionTitle: "Settings",
    pages: [
      {
        id: "add-ai-assets-repo",
        title: "Add AI Assets repo",
        file: "settings/add-ai-assets-repo.md"
      },
      {
        id: "add-development-project-roots",
        title: "Add Development Project Roots",
        file: "settings/add-development-project-roots.md"
      },
      {
        id: "import-export-settings-and-backup-restore-database",
        title: "Import/Export",
        file: "settings/import-export-settings-and-backup-restore-database.md"
      },
      {
        id: "other-settings",
        title: "General Settings",
        file: "settings/other-settings.md"
      },
      {
        id: "ai-api-service",
        title: "AI API Service",
        file: "settings/ai-api-service.md"
      }
    ]
  },
  {
    sectionTitle: "Usage",
    pages: [
      {
        id: "search-filter-definitions",
        title: "Search & Filter definitions",
        file: "usage/search-filter-definitions.md"
      },
      {
        id: "inspect-definition",
        title: "Inspect Definition",
        file: "usage/inspect-definition.md"
      },
      {
        id: "definition-details-actions",
        title: "Definition Details Actions",
        file: "usage/definition-details-actions.md",
        children: [
          {
            id: "definition-details-actions-navigation-and-view-controls",
            title: "Navigation and View Controls",
            file: "usage/definition-details-actions-navigation-and-view-controls.md"
          },
          {
            id: "definition-details-actions-action-buttons",
            title: "Definition Action Buttons",
            file: "usage/definition-details-actions-action-buttons.md"
          },
          {
            id: "definition-details-actions-source",
            title: "Source Tab Actions",
            file: "usage/definition-details-actions-source.md"
          },
          {
            id: "definition-details-actions-test",
            title: "Test Tab Actions",
            file: "usage/definition-details-actions-test.md"
          },
        ]
      },
      {
        id: "edit-definition",
        title: "Edit Definition",
        file: "usage/edit-definition.md"
      },
      {
        id: "create-new-definition",
        title: "Create new Definition",
        file: "usage/create-new-definition.md"
      },
      {
        id: "install-definition-into-project",
        title: "Install Definition into Project",
        file: "usage/install-definition-into-project.md"
      },
      {
        id: "export-to-copilot-and-gemini",
        title: "Export to Copilot and Gemini",
        file: "usage/export-to-copilot-and-gemini.md"
      }
    ]
  },
  {
    sectionTitle: "Navigation & Productivity",
    pages: [
      {
        id: "activity-page",
        title: "Activity",
        file: "usage/activity-page.md"
      },
      {
        id: "run-agent-page",
        title: "Run Agent",
        file: "usage/run-agent-page.md"
      },
      {
        id: "favorites-and-installed-tabs",
        title: "Favorites & Installed tabs",
        file: "usage/favorites-and-installed-tabs.md"
      },
      {
        id: "onboarding-tour",
        title: "Onboarding Tour",
        file: "usage/onboarding-tour.md"
      },
      {
        id: "about-dcc-and-updates",
        title: "About DCC / Updates",
        file: "usage/about-dcc-and-updates.md"
      },
      {
        id: "get-more-ideas",
        title: "Get More Ideas",
        file: "usage/get-more-ideas.md"
      }
    ]
  },
  {
    sectionTitle: "Definitions",
    pages: [
          {
            id: "definitions-schema",
            title: "Definitions Schema",
            file: "usage/definition-schema.md"
          },
          {
            id: "definition-details-actions-test-schema-common",
            title: "Common Fields",
            file: "usage/definition-details-actions-test-schema-common.md"
          },
          {
            id: "definition-details-actions-test-schema-description-markdown-help",
            title: "Description Field",
            file: "usage/description-field-markdown-help.md"
          },
          {
            id: "definition-details-actions-test-schema-rule",
            title: "Rule Structure",
            file: "usage/definition-details-actions-test-schema-rule.md"
          },
          {
            id: "definition-details-actions-test-schema-prompt",
            title: "Prompt Structure",
            file: "usage/definition-details-actions-test-schema-prompt.md"
          },
          {
            id: "definition-details-actions-test-schema-workflow",
            title: "Workflow Structure",
            file: "usage/definition-details-actions-test-schema-workflow.md"
          },
          {
            id: "definition-details-actions-test-schema-agent",
            title: "Agent Structure",
            file: "usage/definition-details-actions-test-schema-agent.md"
          },
          {
            id: "definition-details-actions-test-schema-model",
            title: "Model Structure",
            file: "usage/definition-details-actions-test-schema-model.md"
          },
          {
            id: "definition-details-actions-test-schema-context",
            title: "Context Structure",
            file: "usage/definition-details-actions-test-schema-context.md"
          },
          {
            id: "definition-details-actions-test-schema-mcpserver",
            title: "MCP Server Structure",
            file: "usage/definition-details-actions-test-schema-mcpserver.md"
          },
          {
            id: "definition-details-actions-test-schema-config",
            title: "Config Structure",
            file: "usage/definition-details-actions-test-schema-config.md"
          },
          {
            id: "definition-details-actions-test-schema-docs",
            title: "Docs Structure",
            file: "usage/definition-details-actions-test-schema-docs.md"
          }
        ]
  }
];

function buildPagesById(sections) {
  return new Map(
    sections.flatMap((section) => section.pages.flatMap((page) => {
      const pageEntries = [[page.id, page]];
      if (Array.isArray(page.children)) {
        pageEntries.push(...page.children.map((child) => [child.id, child]));
      }
      return pageEntries;
    }))
  );
}

const filteredTocSections = isAgentEnabled()
  ? tocSections
  : tocSections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((page) => !AGENT_PAGE_IDS.has(page.id))
      }))
      .filter((section) => section.pages.length > 0);

const pagesById = buildPagesById(filteredTocSections);

function getRequestedPageId() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("page");
  if (requested && pagesById.has(requested)) return requested;
  return filteredTocSections[0].pages[0].id;
}

function createHelpPageHref(encodedSafeReturnTo) {
  return function helpPageHref(pageId) {
    return `/user-guide.html?page=${encodeURIComponent(pageId)}&returnTo=${encodedSafeReturnTo}`;
  };
}

export { HELP_PAGES_BASE, filteredTocSections as tocSections, pagesById, getRequestedPageId, createHelpPageHref };
