
# Quick start

## Feature overview

### Install definitions into projects

DCC Hub lets you install a definition into the currently selected development project.
This is the primary workflow for applying Continue definitions locally and keeping a project in sync with curated assets.

### Export to GitHub Copilot and Gemini CLI (v1)

In addition to Continue install, DCC supports destination-aware export for external AI tooling.

- **Supported types in v1:** `rules`, `prompts`
- **Destinations:**
  - **GitHub Copilot:** files under `.github/...`
  - **Gemini CLI:** files under `.gemini/...`

#### Output locations

- **Rules**
  - Copilot: `.github/copilot-instructions.md`
  - Gemini CLI: `.gemini/instructions.md`
- **Prompts**
  - Copilot: `.github/prompts/<dcc-uri-slug>.prompt.md`
  - Gemini CLI: `.gemini/commands/<dcc-uri-slug>.md`

#### Skipped definition types (v1)

Definition types outside of `rules` and `prompts` are skipped for Copilot/Gemini export in v1 because destination-specific mappings are not finalized yet.
This avoids writing ambiguous or lossy conversions and keeps exports predictable.

#### Idempotent update behavior

- Re-exporting the same rule updates the DCC-managed block in the destination instructions file (it does not duplicate blocks).
- Re-exporting the same prompt replaces the same prompt file path.

This makes export runs safe to repeat as definitions evolve.

#### Source-of-truth recommendation

Use **Continue definitions in DCC** as your source of truth.
Treat Copilot/Gemini outputs as generated artifacts that can be refreshed by export.

## First steps

1. Install Git (if not already installed), If git is not recognized, restart PowerShell:
```powershell
winget install --id Git.Git -e
```

2. Install Git LFS (if not already installed):
```powershell
winget install --id GitHub.GitLFS -e
```

3. Verify Git and Git LFS:
```powershell
git --version
git lfs version
```

4. Clone the repository:
```powershell
git clone https://github.com/shaybc/dcc.git
cd dcc
```

5. Enable Git LFS for this machine (run once per computer)
```powershell
git lfs install
```

6. Download LFS-tracked files after clone:
```powershell
git lfs pull
```

## Normal Steps

1. Normal workflow (git pull will automatically download LFS files if hooks are working):
```powershell
git pull
```

2. Add, commit and push changes:
```powershell
git add .
git commit -m "your message"
git push
```

## Troubleshooting

1. If Windows shows `sh dofork` / hook fork errors, remove sh hooks and use a Windows hook:

```powershell
Remove-Item -Force .git\hooks\pre-push      -ErrorAction SilentlyContinue
Remove-Item -Force .git\hooks\post-commit   -ErrorAction SilentlyContinue
Remove-Item -Force .git\hooks\post-checkout -ErrorAction SilentlyContinue
Remove-Item -Force .git\hooks\post-merge    -ErrorAction SilentlyContinue
```

2. then:
```powershell
@"
@echo off
where git-lfs >nul 2>&1 || (echo git-lfs not found in PATH & exit /b 2)
git lfs pre-push %*
"@ | Set-Content -Encoding ASCII .git\hooks\pre-push.bat
```

3. If hooks fail, push without verification and upload LFS manually:

```powershell
git push --no-verify
git lfs push --all origin HEAD
```
