# Schema reference sections

A Continue.dev file is mainly yaml, but some are weitten as Markdown file, the md file has two parts:
1. frontmatter (YAML between --- delimiters) with a required name and description
2. and a body prompt that tells the AI what to do (rules or prompts).

all files are saved to the repo folder under .continue subfoder, each definition type has it's own specific folder (for instance rule definition needs to be kept under: .continue/rules).

There are several type of definitions that continue.dev inject into the ai prompt, here are the schema/structure, explanation and guidance for each definition:

- [Common fields (all definition types)](/user-guide.html?page=definition-details-actions-test-schema-common)
- [Rule structure (`rules`)](/user-guide.html?page=definition-details-actions-test-schema-rule)
- [Prompt structure (`prompts`)](/user-guide.html?page=definition-details-actions-test-schema-prompt)
- [Workflow structure (`workflows`)](/user-guide.html?page=definition-details-actions-test-schema-workflow)
- [Agent structure (`agents`)](/user-guide.html?page=definition-details-actions-test-schema-agent)
- [Model structure (`models`)](/user-guide.html?page=definition-details-actions-test-schema-model)
- [Context structure (`context`)](/user-guide.html?page=definition-details-actions-test-schema-context)
- [MCP Server structure (`mcpservers`)](/user-guide.html?page=definition-details-actions-test-schema-mcpserver)
- [Config structure (`configs`)](/user-guide.html?page=definition-details-actions-test-schema-config)
- [Docs structure (`docs`)](/user-guide.html?page=definition-details-actions-test-schema-docs)
