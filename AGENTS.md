# Repository Guidelines

## Project Structure & Module Organization
- **`climb-you-main/` (Expo React Native):** `src/components`, `src/screens`, `src/navigation`, `src/services/{ai,firebase,security,storage}`, `src/types`, `src/utils`, `assets/`, `App.tsx`, `app.json`, `tsconfig.json`, `project-docs/`, `CLAUDE.md`.
- **`serena/` (Python toolkit):** `src/`, `test/`, `scripts/`, `docs/`, `pyproject.toml`.
- **Configs:** Firebase in `climb-you-main/firebase*.json` and `firestore.rules`; environment from `climb-you-main/.env` (copy `.env.example`).

## Build, Test, and Development Commands
- **React Native setup:** `cd climb-you-main && npm install`.
- **Start app:** `npm start` (Expo dev server). Platforms: `npm run android` | `npm run ios` | `npm run web`.
- **Smoke tests (Node):** `node test_quest_generation.js`, `node test_enhanced_quest_generation.js`.
- **Serena setup:** `cd serena && uv venv` (activate), then `uv pip install --all-extras -r pyproject.toml -e .`.
- **Serena QA:** `poe test` (pytest), `poe lint` (ruff+black), `poe format`, `poe type-check` (mypy).

## Coding Style & Naming Conventions
- **TypeScript:** strict mode; functional components; components/screens in PascalCase (e.g., `ProfileScreen.tsx`); hooks `useX...`; utilities camelCase (e.g., `questPersonalization.ts`); types in `src/types`; prefer named exports and `import type` for type‑only usage.
- **Python:** format with Black (line length 140); lint with Ruff; type‑check with mypy. Keep modules cohesive; functions small and focused.

## Testing Guidelines
- **React Native:** place lightweight unit tests near code (e.g., `Feature.test.ts`); keep Node smoke scripts deterministic and runnable.
- **Serena:** tests live in `serena/test/`; use pytest markers as needed; ensure `poe test` passes locally before PR.

## Commit & Pull Request Guidelines
- **Commits:** follow Conventional Commits (`feat:`, `fix:`, `chore:`).
- **PRs:** include a concise description, linked issues, clear repro steps, and for UI changes a screenshot/GIF. Run `poe lint`, `poe test` (Serena) and verify the Expo app boots (`npm start`).

## Security & Configuration Tips
- **Secrets:** never hardcode API keys. Copy `.env.example` → `.env`; use `secureAPIKeyManager` and platform key stores.
- **Firebase:** review `firebase*.json` and `firestore.rules` when changing data access.
- **Architecture & agents:** see `climb-you-main/CLAUDE.md` and `serena/README.md` for deeper context and agent usage.

