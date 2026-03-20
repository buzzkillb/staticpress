# StaticPress

A WordPress-like admin panel for creating and deploying static sites to Cloudflare Pages.

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

This starts the Astro dev server at http://localhost:4321

## Build

```bash
bun run build
```

Builds the static site to the `dist/` folder.

## Preview

```bash
bun run preview
```

Preview the built site at http://localhost:4322

## Deploy to Cloudflare Pages

1. Go to `/admin/deploy` in the admin panel
2. Enter your Cloudflare project name, API token, and account ID
3. Click "Show Deploy Command" to get the wrangler command
4. Run the command in your terminal:

```bash
CF_API_TOKEN=your_token \
CF_ACCOUNT_ID=your_account_id \
bunx wrangler pages deploy dist --project-name=your-project
```

## Project Structure

```
src/
  content/
    posts/        # Markdown blog posts
    pages/        # Markdown static pages
  pages/
    admin/        # Admin panel pages
    blog/         # Blog post pages
    index.astro   # Homepage
```

## Creating Content

1. Go to `/admin/posts` or `/admin/pages`
2. Create and save your content
3. Download the generated markdown files
4. Place them in `src/content/posts/` or `src/content/pages/`
5. Run `bun run build` to regenerate the static site