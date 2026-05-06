# Git Flow

## Branches

- `main`: production-ready code
- `dev`: staging/integration branch
- `feature/*`: new features
- `fix/*`: bug fixes

## Commit Convention

Use Conventional Commits:
- `feat:`
- `fix:`
- `chore:`
- `refactor:`
- `test:`
- `docs:`

Examples:
- `feat(api): add SNMP sync endpoint`
- `fix(web): handle csrf token refresh on login`

## Pull Requests

Use `.github/pull_request_template.md` and target:
- `dev` for regular feature/fix merges
- `main` for release promotion
