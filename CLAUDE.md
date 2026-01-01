# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static Admin is a Git-based headless CMS inspired by Keystatic, built with Hono + React. Content is stored as Markdown with YAML frontmatter, with auto-commit on save.

## Commands

```bash
# Development
pnpm dev              # Start dev environment (Vite frontend :5173 + Hono API :3001)

# Building
pnpm build            # Build all packages via Turbo

# Testing
pnpm test             # Run all tests (Vitest)
pnpm test:watch       # Watch mode
pnpm test:coverage    # With coverage reports

# Linting
pnpm lint             # Type-check all packages (tsc)
pnpm format           # Format with oxlint
```

## Monorepo Structure

This is a pnpm workspaces monorepo with Turbo orchestration. Six packages:

| Package | Purpose |
|---------|---------|
| `@static-admin/core` | Schema definitions, content management, Git integration, validation (Zod) |
| `@static-admin/api` | API handlers, SQLite/Turso auth, email services (Nodemailer) |
| `@static-admin/ui` | React admin UI components, TipTap editor, form hooks |
| `@static-admin/cms` | Type-safe content querying for Astro/Next.js |
| `@static-admin/client` | Client SDK (minimal, placeholder) |
| `@static-admin/hono` | Hono adapter with auth middleware |

Development environment lives in `dev/` (Vite + Hono example).

## Architecture

### Content Flow
1. **Schema Definition** → `defineConfig()` with `collection()` and `fields.*` builders
2. **Content Manager** → Reads/writes Markdown + frontmatter via storage adapters
3. **Git Integration** → Auto-commits via `GitManager` (simple-git)
4. **API Layer** → CRUD handlers created by `createApiHandlers()`
5. **React UI** → Forms with typed field components, TipTap for rich text

### Storage Adapter Pattern
- `StorageAdapter` interface with local filesystem and GitHub API implementations
- Handles both text (markdown) and binary (images) files

### Field System
11+ field types: text, slug, textarea, date, datetime, checkbox, select, relation, image, array, markdoc (TipTap WYSIWYG). All fields use Zod for validation.

### Key Exports
```typescript
// @static-admin/core
import { defineConfig, collection, singleton, fields } from '@static-admin/core';

// @static-admin/api
import { createApiHandlers, createAuthManager } from '@static-admin/api';

// @static-admin/ui
import { StaticAdminApp, TipTapEditor } from '@static-admin/ui';

// @static-admin/hono
import { createStaticAdmin } from '@static-admin/hono';
```

## Tech Stack

- **API**: Hono 4
- **Frontend**: React 18+, React Router 7
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Editor**: TipTap (ProseMirror-based)
- **Forms**: React Hook Form + Zod
- **Database**: better-sqlite3 or libsql (Turso)
- **Build**: tsup (ESM + CJS dual exports)
- **Testing**: Vitest with v8 coverage

## Testing

Tests are located in `packages/*/src/**/*.test.ts`. Each package has its own `vitest.config.ts`.

```bash
# Run specific package tests
cd packages/core && pnpm test

# Run single test file
pnpm vitest run packages/core/src/schema/fields.test.ts
```
