# Repository Guidelines

## Project Structure & Module Organization

This repository is a Vite + React + TypeScript single-page app. Source code lives in `src/`, with the main entry point at `src/main.tsx` and the primary UI in `src/App.tsx`. Global styles are in `src/styles.css`. Static HTML is in `index.html`. Build and TypeScript configuration are kept at the repository root in `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`.

There is currently no dedicated `tests/` directory and no separate assets directory. If adding assets, prefer `src/assets/` for imported UI assets or `public/` for files served directly by Vite.

## Build, Test, and Development Commands

Use pnpm; the lockfile is `pnpm-lock.yaml`.

- `pnpm install` installs dependencies.
- `pnpm dev` starts the Vite development server on `0.0.0.0`.
- `pnpm build` runs TypeScript project checks with `tsc -b` and creates a production build with Vite.
- `pnpm preview` serves the production build locally for verification.

No test script is currently defined in `package.json`.

## Coding Style & Naming Conventions

Write TypeScript React components as function components. Use PascalCase for components and types such as `ProductCard` and `Message`; use camelCase for variables, functions, and arrays such as `productKits` and `submitQuestion`.

Follow the existing style: 2-space indentation, semicolons, single quotes, and trailing commas in multiline objects/imports. Keep UI-specific types close to the component unless they are reused across modules.

## Testing Guidelines

There is no configured test framework yet. For now, validate changes with:

- `pnpm build` for TypeScript and production-build checks.
- `pnpm dev` for manual browser verification.

If tests are added, prefer colocated names like `ComponentName.test.tsx` or a `src/__tests__/` directory, and add a `pnpm test` script.

## Commit & Pull Request Guidelines

This repository has no existing commits, so no project-specific commit convention is established. Use concise imperative messages, for example `Add product recommendation panel` or `Fix chat input loading state`.

Pull requests should include a short summary, verification steps, and screenshots or recordings for visible UI changes. Link related issues when available and call out configuration or dependency changes explicitly.

## Security & Configuration Tips

Do not commit secrets, local environment files, or generated dependency folders such as `node_modules/`. Keep dependency changes reflected in `pnpm-lock.yaml`.
