# StaticPress

A local-first static site generator with a WordPress-like admin panel. Create blogs, landing pages, and business websites that deploy to Cloudflare Pages for fast, secure, free hosting.

## Features

- **Visual Editor** - WYSIWYG editing with TipTap
- **Markdown Support** - Toggle to raw markdown for power users
- **Live Preview** - See changes in real-time (split view, iframe, or rendered HTML)
- **SEO Optimized** - Sitemap, robots.txt, Open Graph, and Twitter cards built-in
- **Cloudflare Ready** - One-click deploy to Cloudflare Pages
- **Dark Mode** - Built-in dark mode support
- **Fast Static Files** - Pure HTML/CSS, no JavaScript required for visitors

## Requirements

- [Bun](https://bun.sh) - Runtime
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - For Cloudflare deployment

## Quick Start

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# Open admin panel
open http://localhost:4321/admin/
```

## Workflow

1. **Create Content** - Go to `/admin/` to create posts and pages
2. **Edit** - Use visual mode or markdown toggle
3. **Preview** - See live preview as you edit
4. **Save** - Saves markdown files to `src/content/posts/` or `src/content/pages/`
5. **Build** - Click "Build Site" or run `bun run build`
6. **Deploy** - Click "Deploy" to push to Cloudflare Pages

## Project Structure

```
├── src/
│   ├── content/
│   │   ├── posts/      # Blog posts (markdown)
│   │   └── pages/      # Static pages (markdown)
│   ├── pages/
│   │   ├── blog/       # Blog post routes
│   │   ├── [slug].astro # Static page routes
│   │   └── index.astro  # Homepage
│   ├── layouts/         # Shared layouts
│   ├── lib/             # Utilities
│   └── server.ts        # Dev server
├── admin/
│   └── index.html       # Admin SPA
├── dist/                # Built output
└── public/             # Static assets
```

## Configuration

### Site URL

Before deploying, update the site URL in:
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[slug].astro`
- `src/pages/[slug].astro`

Replace `https://yoursite.com` with your actual domain.

### Cloudflare Setup

1. Create a Cloudflare Pages project
2. Go to `/admin/deploy` in the admin panel
3. Enter your:
   - Project Name
   - API Token (needs "Cloudflare Pages: Edit" permission)
   - Account ID

## SEO

StaticPress includes:

- **Sitemap** - Auto-generated at `/sitemap.xml`
- **Robots.txt** - Configured at `/robots.txt`
- **Meta Tags** - Title, description, canonical URLs
- **Open Graph** - Social sharing cards
- **Twitter Cards** - Twitter metadata

## Commands

```bash
bun run dev      # Start dev server (serves admin + builds on save)
bun run build    # Build static site to dist/
bun run preview  # Preview built site locally
bun run deploy   # Deploy to Cloudflare Pages
```

## Tech Stack

- **Astro** - Static site generator
- **TipTap** - Rich text editor
- **Tailwind CSS** - Styling
- **Bun** - Runtime and dev server
- **Cloudflare Pages** - Hosting

## Security

- Admin panel is never deployed (not in `dist/`)
- API routes are never deployed
- Only static HTML/CSS/JS goes to Cloudflare Pages
- robots.txt blocks crawlers from admin/API

## License

MIT
