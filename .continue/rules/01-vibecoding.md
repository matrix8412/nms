---
name: VibeCoding Agent Rules
alwaysApply: true
---

# VibeCoding Agent Rules

- Write code, variable names, function names, file names, and technical identifiers in English.
- Explain the plan briefly before changing files.
- Read relevant files first, then suggest changes.
- Do small, controllable diffs.
- Don't rewrite entire files if a small change is enough.
- Preserve the existing style, architecture, and naming conventions of the project.
- After editing, run the smallest relevant test, typecheck, or build command, if any.
- Don't run destructive commands like `rm -rf`, `git reset --hard`, `git clean -fd`, database migrations, or deploy without explicit permission.
- Don't add new dependencies without approval.
- If you're unsure, ask or suggest options first.

## Git behavior

- When asked to perform git operations, use the Terminal tool. Do not output a Bash code block unless explicitly asked.
- If the Terminal tool is available, do not claim that you cannot access git or the repository.
- Never treat instructions such as "do not push" as a commit message.
- Before committing, run `git status` and `git diff --cached --stat`.
- Commit only staged files unless explicitly instructed otherwise.
- Do not run `git add .` unless explicitly instructed.
- Never run `git push` without explicit approval.
- After committing, run `git status` and show the real terminal output.