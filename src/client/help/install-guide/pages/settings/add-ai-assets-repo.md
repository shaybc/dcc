# Add AI Assets Repo

Use AI Assets repositories to keep prompts, rules, docs, workflows, and other assets maintained by the teams that own that domain expertise.

## Why add AI Assets repos?

- **Separation of concerns:** each development team can own and evolve its own AI assets.
- **Shared resources:** users can consume prompts and rules produced by other teams.
- **Scalability:** add multiple repos for different products or domains.
- **Consistency:** use centrally maintained assets instead of local one-off copies.

## Steps

1. In DCC Hub, open **Settings**.
2. In **Asset Repositories**, click **Add Repository**.
3. Fill in:
   - **Repository Name** (friendly identifier)
   - **Repository Remote URL** (git URL)
   - **Clone Folder** (local folder where the repo will be cloned)
4. Save the new repository entry.
5. Run **Clone** (first time) or **Pull** (already cloned) to fetch the latest assets.
6. Confirm that definitions from the repo appear in the Hub.

## Clone / Pull behavior

- **Clone** downloads the repository for the first time into the chosen folder.
- **Pull** updates an existing local clone with latest remote changes.
- Re-run pull regularly so recommendations and definitions stay current.

![Settings Asset Repositories section with Add Repository action](images/settings-add-ai-assets-repo-form.png)
