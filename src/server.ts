import { renderMarkdown, extractFrontmatter, formatFrontmatter, slugify } from './lib/markdown';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'src', 'content');
const POSTS_DIR = join(CONTENT_DIR, 'posts');
const PAGES_DIR = join(CONTENT_DIR, 'pages');
const DIST_DIR = join(ROOT, 'dist');
const ADMIN_DIR = join(ROOT, 'admin');

// Simple cache with TTL
interface Cache {
  posts: any[];
  pages: any[];
  timestamp: number;
}
let contentCache: Cache | null = null;
const CACHE_TTL = 5000; // 5 seconds

function getCachedContent() {
  if (contentCache && Date.now() - contentCache.timestamp < CACHE_TTL) {
    return contentCache;
  }
  return null;
}

function invalidateCache() {
  contentCache = null;
}

// Ensure directories exist
function ensureDirectories() {
  if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });
  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  if (!existsSync(PAGES_DIR)) mkdirSync(PAGES_DIR, { recursive: true });
  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });
}

// Import existing content with caching
function importExistingContent() {
  const cached = getCachedContent();
  if (cached) {
    return cached;
  }
  
  const posts: any[] = [];
  const pages: any[] = [];
  
  // Import posts
  if (existsSync(POSTS_DIR)) {
    const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
        const { data, body } = extractFrontmatter(content);
        const slug = file.replace('.md', '');
        posts.push({
          slug,
          ...data,
          content: body,
          file,
        });
      } catch (e) {
        console.error(`Error reading post ${file}:`, e);
      }
    }
  }
  
  // Import pages
  if (existsSync(PAGES_DIR)) {
    const files = readdirSync(PAGES_DIR).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(PAGES_DIR, file), 'utf-8');
        const { data, body } = extractFrontmatter(content);
        const slug = file.replace('.md', '');
        pages.push({
          slug,
          ...data,
          content: body,
          file,
        });
      } catch (e) {
        console.error(`Error reading page ${file}:`, e);
      }
    }
  }
  
  contentCache = { posts, pages, timestamp: Date.now() };
  return { posts, pages };
}

// Write post/page to file
function writeContentFile(type: 'post' | 'page', slug: string, data: any, content: string): boolean {
  try {
    const dir = type === 'post' ? POSTS_DIR : PAGES_DIR;
    const filename = `${slug}.md`;
    const filepath = join(dir, filename);
    
    const frontmatter = {
      title: data.title || slug,
      date: data.date || new Date().toISOString().split('T')[0],
      excerpt: data.excerpt || '',
      published: data.published ?? false,
      ...(type === 'page' ? {} : {}),
    };
    
    const fileContent = formatFrontmatter(frontmatter, content);
    writeFileSync(filepath, fileContent, 'utf-8');
    invalidateCache();
    return true;
  } catch (e) {
    console.error(`Error writing ${type} ${slug}:`, e);
    return false;
  }
}

// Delete post/page file
function deleteContentFile(type: 'post' | 'page', slug: string): boolean {
  try {
    const dir = type === 'post' ? POSTS_DIR : PAGES_DIR;
    const filepath = join(dir, `${slug}.md`);
    if (existsSync(filepath)) {
      rmSync(filepath);
    }
    invalidateCache();
    return true;
  } catch (e) {
    console.error(`Error deleting ${type} ${slug}:`, e);
    return false;
  }
}

// Run build command
function runBuild(): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    console.log('Running astro build...');
    const proc = spawn('bun', ['run', 'build'], { cwd: ROOT });
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

// Run deploy command
function runDeploy(): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    console.log('Running wrangler deploy...');
    const proc = spawn('bunx', ['wrangler', 'pages', 'deploy', 'dist'], { cwd: ROOT });
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

// Serve static file
function serveFile(filepath: string, contentType: string) {
  try {
    if (existsSync(filepath)) {
      const content = readFileSync(filepath);
      return new Response(content, {
        headers: { 'Content-Type': contentType },
      });
    }
  } catch (e) {
    console.error(`Error serving ${filepath}:`, e);
  }
  return new Response('Not Found', { status: 404 });
}

function getContentType(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase() || '';
  const contentTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    txt: 'text/plain',
    xml: 'application/xml',
  };
  return contentTypes[ext] || 'text/plain';
}

// Parse request body
async function parseBody<T>(request: Request): Promise<T> {
  return request.json();
}

// Handle API routes
async function handleAPI(url: URL, method: string, request: Request): Promise<Response> {
  const pathname = url.pathname;
  
  // GET /api/posts
  if (pathname === '/api/posts' && method === 'GET') {
    const { posts } = importExistingContent();
    return Response.json(posts);
  }
  
  // GET /api/posts/:slug
  const postMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && method === 'GET') {
    const slug = postMatch[1];
    const filepath = join(POSTS_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath, 'utf-8');
      const { data, body } = extractFrontmatter(content);
      return Response.json({ slug, ...data, content: body });
    }
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }
  
  // POST /api/posts/:slug
  if (postMatch && method === 'POST') {
    const slug = postMatch[1];
    const body = await parseBody<any>(request);
    const success = writeContentFile('post', slug, body, body.content || '');
    if (success) {
      return Response.json({ success: true, slug });
    }
    return Response.json({ error: 'Failed to save post' }, { status: 500 });
  }
  
  // DELETE /api/posts/:slug
  if (postMatch && method === 'DELETE') {
    const slug = postMatch[1];
    const success = deleteContentFile('post', slug);
    return Response.json({ success });
  }
  
  // GET /api/pages
  if (pathname === '/api/pages' && method === 'GET') {
    const { pages } = importExistingContent();
    return Response.json(pages);
  }
  
  // GET /api/pages/:slug
  const pageMatch = pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (pageMatch && method === 'GET') {
    const slug = pageMatch[1];
    const filepath = join(PAGES_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath, 'utf-8');
      const { data, body } = extractFrontmatter(content);
      return Response.json({ slug, ...data, content: body });
    }
    return Response.json({ error: 'Page not found' }, { status: 404 });
  }
  
  // POST /api/pages/:slug
  if (pageMatch && method === 'POST') {
    const slug = pageMatch[1];
    const body = await parseBody<any>(request);
    const success = writeContentFile('page', slug, body, body.content || '');
    if (success) {
      return Response.json({ success: true, slug });
    }
    return Response.json({ error: 'Failed to save page' }, { status: 500 });
  }
  
  // DELETE /api/pages/:slug
  if (pageMatch && method === 'DELETE') {
    const slug = pageMatch[1];
    const success = deleteContentFile('page', slug);
    return Response.json({ success });
  }
  
  // POST /api/build
  if (pathname === '/api/build' && method === 'POST') {
    const result = await runBuild();
    return Response.json(result);
  }
  
  // POST /api/deploy
  if (pathname === '/api/deploy' && method === 'POST') {
    const result = await runDeploy();
    return Response.json(result);
  }
  
  // GET /api/render - render markdown to HTML for preview
  if (pathname === '/api/render' && method === 'POST') {
    const body = await parseBody<{ content: string }>(request);
    const html = renderMarkdown(body.content || '');
    return Response.json({ html });
  }
  
  return Response.json({ error: 'Not found' }, { status: 404 });
}

// Generate sitemap
function generateSitemap(): string {
  const { posts, pages } = importExistingContent();
  const baseUrl = 'https://yoursite.com'; // User should configure this
  
  const urls: string[] = [
    `<url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${baseUrl}/blog/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  ];
  
  // Add published posts
  for (const post of posts) {
    if (post.published) {
      const lastmod = post.date ? new Date(post.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      urls.push(`<url><loc>${baseUrl}/blog/${post.slug}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
    }
  }
  
  // Add pages
  for (const page of pages) {
    urls.push(`<url><loc>${baseUrl}/${page.slug}/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// Main server
async function server(port: number = 4321) {
  ensureDirectories();
  const initialContent = importExistingContent();
  console.log(`Imported ${initialContent.posts.length} posts and ${initialContent.pages.length} pages`);
  
  console.log(`StaticPress server running at http://localhost:${port}`);
  console.log(`Admin UI: http://localhost:${port}/admin/`);
  
  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // API routes - localhost only for security
      if (pathname.startsWith('/api/')) {
        const host = request.headers.get('host') || '';
        const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
        if (!isLocalhost) {
          return new Response('API not available', { status: 403 });
        }
        return handleAPI(url, request.method, request);
      }
      
      // Sitemap
      if (pathname === '/sitemap.xml') {
        return new Response(generateSitemap(), {
          headers: { 'Content-Type': 'application/xml' },
        });
      }
      
      // Robots.txt
      if (pathname === '/robots.txt') {
        const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${url.origin}/sitemap.xml

# Security
Disallow: /admin/
Disallow: /api/`;
        return new Response(robotsTxt, {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      
      // Admin SPA
      if (pathname === '/admin' || pathname === '/admin/') {
        const adminIndex = join(ADMIN_DIR, 'index.html');
        if (existsSync(adminIndex)) {
          return serveFile(adminIndex, 'text/html');
        }
        return new Response('Admin not found. Run build first.', { status: 404 });
      }
      
      // Admin assets
      if (pathname.startsWith('/admin/')) {
        const filepath = join(ADMIN_DIR, pathname.slice(7));
        const ext = filepath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          html: 'text/html',
          css: 'text/css',
          js: 'application/javascript',
          json: 'application/json',
          png: 'image/png',
          jpg: 'image/jpeg',
          svg: 'image/svg+xml',
        };
        return serveFile(filepath, contentTypes[ext || ''] || 'text/plain');
      }
      
      // Built static files (after build)
      const distPath = join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
      
      // Check for exact file
      if (existsSync(distPath)) {
        const ext = distPath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          html: 'text/html',
          css: 'text/css',
          js: 'application/javascript',
          json: 'application/json',
          png: 'image/png',
          jpg: 'image/jpeg',
          svg: 'image/svg+xml',
          ico: 'image/x-icon',
          txt: 'text/plain',
          xml: 'application/xml',
        };
        return serveFile(distPath, contentTypes[ext || ''] || 'text/plain');
      }
      
      // Check for index.html in directory
      const indexPath = join(distPath, 'index.html');
      if (existsSync(indexPath)) {
        return serveFile(indexPath, 'text/html');
      }
      
      // Fallback to Astro src for dev (if no build exists)
      const srcPath = join(ROOT, 'src', 'pages', pathname === '/' ? 'index.astro' : pathname + '.astro');
      if (existsSync(srcPath)) {
        // For .astro files, we can't serve them directly - need to build first
        // So we redirect to built version or show message
        const builtIndex = join(DIST_DIR, 'index.html');
        if (existsSync(builtIndex)) {
          return serveFile(builtIndex, 'text/html');
        }
        return new Response('Please run `bun run build` first', { status: 200 });
      }
      
      // 404
      return new Response('Not Found', { status: 404 });
    },
  });
}

server();
