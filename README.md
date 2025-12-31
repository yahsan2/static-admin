# Static Admin

A Git-based headless CMS inspired by Keystatic, built with Hono + React.

## Features

- **File-based content**: Content stored as Markdown with frontmatter
- **Git integration**: Auto-commit on save
- **TipTap WYSIWYG**: Rich text editing with Markdown output
- **SQLite auth**: Simple authentication with sessions
- **Type-safe schema**: Define content schemas with TypeScript
- **Framework adapters**: Hono adapter included, more coming

## Packages

| Package | Description |
|---------|-------------|
| `@static-admin/core` | Schema definitions, content management, validation |
| `@static-admin/api` | API handlers, SQLite authentication |
| `@static-admin/ui` | React admin interface |
| `@static-admin/hono` | Hono adapter |

## Quick Start

### 1. Install dependencies

```bash
pnpm add @static-admin/core @static-admin/hono hono
```

### 2. Create config file

```typescript
// static-admin.config.ts
import { defineConfig, collection, fields } from '@static-admin/core';

export default defineConfig({
  storage: {
    contentPath: 'content',
  },
  git: {
    autoCommit: true,
  },
  auth: {
    database: './admin.db',
  },
  collections: {
    posts: collection({
      label: 'Posts',
      path: 'posts/*',
      slugField: 'title',
      schema: {
        title: fields.text({ label: 'Title', required: true }),
        slug: fields.slug({ from: 'title', label: 'Slug' }),
        date: fields.date({ label: 'Date' }),
        draft: fields.checkbox({ label: 'Draft' }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
  },
});
```

### 3. Create server

```typescript
// src/index.ts
import { Hono } from 'hono';
import { staticAdmin } from '@static-admin/hono';
import config from './static-admin.config';

const app = new Hono();
app.route('/admin', staticAdmin({ config }));

export default app;
```

### 4. Run

```bash
pnpm dev
```

Visit `http://localhost:3000/admin` to access the admin panel.

## Field Types

| Type | Description |
|------|-------------|
| `text` | Single-line text |
| `slug` | URL slug (auto-generated) |
| `textarea` | Multi-line text |
| `date` | Date picker |
| `checkbox` | Boolean toggle |
| `select` | Dropdown select |
| `relation` | Reference to another collection |
| `image` | Image upload |
| `array` | Repeatable items |
| `markdoc` | Rich text (TipTap WYSIWYG) |

## Content Structure

```
content/
└── posts/
    └── hello-world/
        ├── index.md       # frontmatter + content
        └── images/
            └── hero.jpg   # uploaded images
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/api/auth/login` | Login |
| POST | `/admin/api/auth/logout` | Logout |
| GET | `/admin/api/schema` | Get schema |
| GET | `/admin/api/entries/:collection` | List entries |
| GET | `/admin/api/entries/:collection/:slug` | Get entry |
| POST | `/admin/api/entries/:collection` | Create entry |
| PUT | `/admin/api/entries/:collection/:slug` | Update entry |
| DELETE | `/admin/api/entries/:collection/:slug` | Delete entry |
| POST | `/admin/api/upload/:collection/:slug` | Upload image |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run example
cd examples/with-hono
pnpm dev
```

## License

MIT
