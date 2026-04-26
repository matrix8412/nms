# Project AI Agent Instructions

## General rules

- Before implementing any new feature, inspect the existing project structure.
- Do not introduce new libraries unless they are clearly necessary.
- Prefer modifying existing patterns over creating new architectural styles.
- Keep changes small and focused.
- Do not silently change unrelated files.
- If something is ambiguous, make the safest minimal implementation and document the assumption.

## Feature implementation workflow
1. Read the relevant existing code first.
2. Identify the closest existing pattern.
3. Implement the feature using the same conventions.
4. Add or update tests if the project has tests.
5. Check TypeScript/linter/build errors before finishing.
6. Summarize changed files and reasoning.

## Code style

- Use existing naming conventions.
- Prefer simple, readable code over clever abstractions.
- Do not duplicate business logic.
- Extract helpers only when the same logic is used more than once.
- In forms and edit panels, keep searchable select controls visually consistent with host editing; prefer the compact `app-searchable-select` variant instead of introducing a larger one-off style.
- For historical or monitoring graphs, use the shared `app-time-series-chart` component with solid lines, a range selector, and MRTG-style min/max/avg legend instead of building one-off SVG charts.

## Security and safety

- Never hardcode secrets, tokens, passwords, or API keys.
- Validate external input.
- Do not weaken authentication, authorization, or validation logic.