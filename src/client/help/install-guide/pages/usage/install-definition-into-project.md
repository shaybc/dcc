# Install Definition into Project

Install selected definitions into the currently selected development project.

## Select the current project first

1. In the Hub header, choose a project from the **Dev project** selector.
2. Make sure you are on the project where you want definitions installed.

When you switch projects, installation markers update so you can see what is already installed per project.

## Install action

1. Open a definition details view.
2. Click the **+** button (**Install definition in current project**).
3. DCC Hub installs the definition into the selected project.

## Installed state and filtering options

- Installed definitions are visibly marked for the current project.
- Use the **Installed** filter to show only installed definitions.
- Use **Hide Installed Definitions** from the menu to focus only on definitions not yet installed.

## Merge behavior during install

For complex definitions (such as configuration-based definitions), installation can include merge logic:

- Existing project configuration is read.
- New definition content is merged into compatible sections.
- Existing values are preserved where possible.
- Resulting config is written back in install target files.

This helps apply shared definitions without fully replacing project-specific customization.

![Install definition button and installed markers per selected project](images/usage-install-definition-into-project.png)
