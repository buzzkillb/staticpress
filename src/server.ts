import { renderMarkdown, extractFrontmatter, formatFrontmatter, slugify } from './lib/markdown';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, renameSync, statSync } from 'fs';
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
const MEDIA_DIR = join(ROOT, 'public', 'media');

const PLACEHOLDER_SITE = 'https://yoursite.com';

interface SiteConfig {
  siteUrl: string;
  formspreeId: string;
  siteName: string;
  author: string;
}

function loadSiteConfig(): SiteConfig {
  const configPath = join(ROOT, 'site.config.json');
  const defaultConfig = {
    siteUrl: PLACEHOLDER_SITE,
    formspreeId: 'YOUR_FORMSPREE_ID',
    siteName: 'My Site',
    author: 'Site Author',
  };
  
  if (!existsSync(configPath)) {
    return defaultConfig;
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as SiteConfig;
  } catch {
    return defaultConfig;
  }
}

const siteConfig = loadSiteConfig();

interface Cache {
  posts: any[];
  pages: any[];
  media: any[];
  timestamp: number;
}
let contentCache: Cache | null = null;
const CACHE_TTL = 1000; // 1 second cache to reduce stale data window

function getCachedContent() {
  if (contentCache && Date.now() - contentCache.timestamp < CACHE_TTL) {
    return contentCache;
  }
  // Cache expired or missing - invalidate and return null
  contentCache = null;
  return null;
}

function invalidateCache() {
  contentCache = null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function ensureDirectories() {
  if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });
  if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
  if (!existsSync(PAGES_DIR)) mkdirSync(PAGES_DIR, { recursive: true });
  if (!existsSync(DIST_DIR)) mkdirSync(DIST_DIR, { recursive: true });
  if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });
}

function importExistingContent() {
  const cached = getCachedContent();
  if (cached) {
    return { posts: cached.posts, pages: cached.pages };
  }
  
  const posts: any[] = [];
  const pages: any[] = [];
  
  if (existsSync(POSTS_DIR)) {
    const files = readdirSync(POSTS_DIR).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
        const { data, body } = extractFrontmatter(content);
        const slug = file.replace('.md', '');
        posts.push({ slug, ...data, content: body, file });
      } catch (e) {
        console.error(`Error reading post ${file}:`, e);
      }
    }
  }
  
  if (existsSync(PAGES_DIR)) {
    const files = readdirSync(PAGES_DIR).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(PAGES_DIR, file), 'utf-8');
        const { data, body } = extractFrontmatter(content);
        const slug = file.replace('.md', '');
        pages.push({ slug, ...data, content: body, file });
      } catch (e) {
        console.error(`Error reading page ${file}:`, e);
      }
    }
  }
  
  if (!contentCache) contentCache = { posts: [], pages: [], media: [], timestamp: Date.now() };
  contentCache.posts = posts;
  contentCache.pages = pages;
  contentCache.timestamp = Date.now();
  
  return { posts, pages };
}

function getMediaFiles() {
  if (!existsSync(MEDIA_DIR)) return [];
  
  const cached = getCachedContent();
  if (cached && cached.media.length > 0) {
    return cached.media;
  }
  
  const files = readdirSync(MEDIA_DIR).filter((f: string) => {
    const ext = f.toLowerCase();
    return ext.endsWith('.webp') || ext.endsWith('.avif') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.gif');
  });
  
  const media = files.map((file: string) => {
    const filepath = join(MEDIA_DIR, file);
    const stats = { size: 0 };
    try {
      const { size } = statSync(filepath);
      stats.size = size;
    } catch (e) {}
    
    const sizeKB = (stats.size / 1024).toFixed(1);
    const sizeStr = stats.size > 1024 * 1024 ? `${(stats.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKB} KB`;
    
    return {
      name: file,
      url: `/media/${file}`,
      size: sizeStr,
    };
  });
  
  if (!contentCache) contentCache = { posts: [], pages: [], media: [], timestamp: Date.now() };
  contentCache.media = media;
  
  return media;
}

async function compressImage(inputBuffer: Buffer, filename: string): Promise<{ buffer: Buffer; filename: string }> {
  try {
    const sharp = (await import('sharp')).default;
    
    const ext = filename.toLowerCase();
    let outputBuffer: Buffer;
    let outputFilename: string;
    
    if (ext.endsWith('.png')) {
      outputBuffer = await sharp(inputBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9 })
        .toBuffer();
      outputFilename = filename.replace(/\.png$/, '.webp');
    } else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
      outputBuffer = await sharp(inputBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      outputFilename = filename.replace(/\.jpe?g$/, '.webp');
    } else if (ext.endsWith('.gif')) {
      outputBuffer = await sharp(inputBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .gif()
        .toBuffer();
      outputFilename = filename.replace(/\.gif$/, '.webp');
    } else {
      outputBuffer = await sharp(inputBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      outputFilename = filename.endsWith('.webp') ? filename : `${filename}.webp`;
    }
    
    return { buffer: outputBuffer, filename: outputFilename };
  } catch (e) {
    console.error('Image compression failed:', e);
    return { buffer: inputBuffer, filename };
  }
}

const MAX_CONTENT_SIZE = 1 * 1024 * 1024; // 1MB limit

function writeContentFile(type: 'post' | 'page', slug: string, data: any, content: string): boolean {
  try {
    // Validate content size
    if (content.length > MAX_CONTENT_SIZE) {
      console.error(`Content too large for ${type} ${slug}: ${content.length} bytes`);
      return false;
    }
    
    // Validate slug format (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      console.error(`Invalid slug format: ${slug}`);
      return false;
    }
    
    const dir = type === 'post' ? POSTS_DIR : PAGES_DIR;
    const filename = `${slug}.md`;
    const filepath = join(dir, filename);
    const tempFilepath = join(dir, `.${filename}.tmp`);
    
    const frontmatter: Record<string, any> = {
      title: data.title || slug,
      date: data.date || new Date().toISOString().split('T')[0],
      excerpt: data.excerpt || '',
      published: data.published ?? false,
    };
    
    const fileContent = formatFrontmatter(frontmatter, content);
    
    // Atomic write: write to temp file first, then rename
    writeFileSync(tempFilepath, fileContent, 'utf-8');
    rmSync(filepath); // Remove old file if exists
    renameSync(tempFilepath, filepath); // Atomic rename
    
    invalidateCache();
    return true;
  } catch (e) {
    console.error(`Error writing ${type} ${slug}:`, e);
    return false;
  }
}

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

function deleteMediaFile(filename: string): boolean {
  try {
    // Validate filename - only allow safe characters and prevent path traversal
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*$/.test(filename)) {
      console.error(`Invalid filename format: ${filename}`);
      return false;
    }
    
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.error(`Path traversal attempt detected: ${filename}`);
      return false;
    }
    
    const filepath = join(MEDIA_DIR, filename);
    
    // Ensure resolved path is within MEDIA_DIR
    if (!filepath.startsWith(MEDIA_DIR)) {
      console.error(`Access denied - path outside media directory: ${filepath}`);
      return false;
    }
    
    if (existsSync(filepath)) {
      rmSync(filepath);
    }
    invalidateCache();
    return true;
  } catch (e) {
    console.error(`Error deleting media ${filename}:`, e);
    return false;
  }
}

function runBuild(): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    console.log('Running astro build...');
    const proc = spawn('bun', ['run', 'build'], { cwd: ROOT });
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data: Buffer) => {
      error += data.toString();
    });
    
    proc.on('close', (code: number) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

function runDeploy(): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    console.log('Running wrangler deploy...');
    const proc = spawn('bunx', ['wrangler', 'pages', 'deploy', 'dist'], { cwd: ROOT });
    let output = '';
    let error = '';
    
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data: Buffer) => {
      error += data.toString();
    });
    
    proc.on('close', (code: number) => {
      resolve({
        success: code === 0,
        output,
        error: error || undefined,
      });
    });
  });
}

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
    webp: 'image/webp',
    avif: 'image/avif',
  };
  return contentTypes[ext] || 'text/plain';
}

async function parseBody<T>(request: Request): Promise<T> {
  return request.json();
}

async function parseMultiPart(request: Request): Promise<{ fields: Record<string, string>; file?: { name: string; data: Buffer; type: string } }> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  let file: { name: string; data: Buffer; type: string } | undefined;
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      fields[key] = value;
    } else if (value instanceof File) {
      const buffer = await value.arrayBuffer();
      file = {
        name: value.name,
        data: Buffer.from(buffer),
        type: value.type,
      };
    }
  }
  
  return { fields, file };
}

async function handleAPI(url: URL, method: string, request: Request): Promise<Response> {
  const pathname = url.pathname;
  
  if (pathname === '/api/posts' && method === 'GET') {
    const { posts } = importExistingContent();
    return Response.json(posts);
  }
  
  const postMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
  if (postMatch && method === 'GET') {
    const slug = postMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const filepath = join(POSTS_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath, 'utf-8');
      const { data, body } = extractFrontmatter(content);
      return Response.json({ slug, ...data, content: body });
    }
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }
  
  if (postMatch && method === 'POST') {
    const slug = postMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const body = await parseBody<any>(request);
    const success = writeContentFile('post', slug, body, body.content || '');
    if (success) {
      return Response.json({ success: true, slug });
    }
    return Response.json({ error: 'Failed to save post' }, { status: 500 });
  }
  
  if (postMatch && method === 'DELETE') {
    const slug = postMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const success = deleteContentFile('post', slug);
    return Response.json({ success });
  }
  
  if (pathname === '/api/pages' && method === 'GET') {
    const { pages } = importExistingContent();
    return Response.json(pages);
  }
  
  const pageMatch = pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (pageMatch && method === 'GET') {
    const slug = pageMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const filepath = join(PAGES_DIR, `${slug}.md`);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath, 'utf-8');
      const { data, body } = extractFrontmatter(content);
      return Response.json({ slug, ...data, content: body });
    }
    return Response.json({ error: 'Page not found' }, { status: 404 });
  }
  
  if (pageMatch && method === 'POST') {
    const slug = pageMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const body = await parseBody<any>(request);
    const success = writeContentFile('page', slug, body, body.content || '');
    if (success) {
      return Response.json({ success: true, slug });
    }
    return Response.json({ error: 'Failed to save page' }, { status: 500 });
  }
  
  if (pageMatch && method === 'DELETE') {
    const slug = pageMatch[1];
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return Response.json({ error: 'Invalid slug' }, { status: 400 });
    }
    const success = deleteContentFile('page', slug);
    return Response.json({ success });
  }
  
  if (pathname === '/api/build' && method === 'POST') {
    const result = await runBuild();
    return Response.json(result);
  }
  
  if (pathname === '/api/deploy' && method === 'POST') {
    const result = await runDeploy();
    return Response.json(result);
  }
  
  if (pathname === '/api/render' && method === 'POST') {
    const body = await parseBody<{ content: string }>(request);
    const html = renderMarkdown(body.content || '');
    return Response.json({ html, sanitized: html });
  }
  
  if (pathname === '/api/media' && method === 'GET') {
    const media = getMediaFiles();
    return Response.json(media);
  }
  
      if (pathname === '/api/media/upload' && method === 'POST') {
        try {
          const { file } = await parseMultiPart(request);
          if (!file) {
            return Response.json({ error: 'No file provided' }, { status: 400 });
          }
          
          if (!file.type.startsWith('image/')) {
            return Response.json({ error: 'Only images are allowed' }, { status: 400 });
          }
          
          if (file.type.includes('svg')) {
            return Response.json({ error: 'SVG files are not allowed for security reasons' }, { status: 400 });
          }
          
          if (file.data.length > 10 * 1024 * 1024) {
            return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
          }
          
          const compressed = await compressImage(file.data, file.name);
          let buffer = compressed.buffer;
          let filename = compressed.filename;
          
          const uniqueName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filepath = join(MEDIA_DIR, uniqueName);
          writeFileSync(filepath, buffer);
          
          invalidateCache();
          
          return Response.json({
            success: true,
            filename: uniqueName,
            url: `/media/${uniqueName}`,
            size: `${(buffer.length / 1024).toFixed(1)} KB`,
          });
        } catch (e) {
          console.error('Media upload error:', e);
          return Response.json({ error: 'Upload failed' }, { status: 500 });
        }
      }
  
  const mediaDeleteMatch = pathname.match(/^\/api\/media\/(.+)$/);
  if (mediaDeleteMatch && method === 'DELETE') {
    const filename = decodeURIComponent(mediaDeleteMatch[1]);
    const success = deleteMediaFile(filename);
    return Response.json({ success });
  }
  
  return Response.json({ error: 'Not found' }, { status: 404 });
}

function generateSitemap(): string {
  const { posts, pages } = importExistingContent();
  const baseUrl = escapeXml(siteConfig.siteUrl);
  
  if (siteConfig.siteUrl === PLACEHOLDER_SITE) {
    console.warn('\n⚠️  Warning: Site URL is still set to placeholder value "https://yoursite.com"');
    console.warn('   Update site.config.json before deploying.\n');
  }
  
  const urls: string[] = [
    `<url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${baseUrl}/blog/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  ];
  
  for (const post of posts) {
    if (post.published) {
      const lastmod = post.date ? new Date(post.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const slug = escapeXml(post.slug);
      urls.push(`<url><loc>${baseUrl}/blog/${slug}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
    }
  }
  
  for (const page of pages) {
    if (page.published !== false) {
      const slug = escapeXml(page.slug);
      urls.push(`<url><loc>${baseUrl}/${slug}/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

async function server(port: number = 4321) {
  ensureDirectories();
  const initialContent = importExistingContent();
  console.log(`Imported ${initialContent.posts.length} posts and ${initialContent.pages.length} pages`);
  
  console.log(`StaticPress server running at http://127.0.0.1:${port}`);
  console.log(`Admin UI: http://127.0.0.1:${port}/admin/`);
  
  Bun.serve({
    port,
    hostname: '127.0.0.1',
    async fetch(request) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // API endpoints are protected - only allow from localhost
      // Since server binds to 127.0.0.1, requests already come from localhost
      // But we verify the hostname to prevent host header injection
      if (pathname.startsWith('/api/')) {
        const hostname = url.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        if (!isLocalhost) {
          return new Response('API not available', { status: 403 });
        }
        return handleAPI(url, request.method, request);
      }
      
      if (pathname === '/sitemap.xml') {
        return new Response(generateSitemap(), {
          headers: { 'Content-Type': 'application/xml' },
        });
      }
      
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
      
      if (pathname === '/admin' || pathname === '/admin/') {
        const adminIndex = join(ADMIN_DIR, 'index.html');
        if (existsSync(adminIndex)) {
          return serveFile(adminIndex, 'text/html');
        }
        return new Response('Admin not found. Run build first.', { status: 404 });
      }
      
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
      
      const distPath = join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
      
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
          webp: 'image/webp',
          avif: 'image/avif',
        };
        return serveFile(distPath, contentTypes[ext || ''] || 'text/plain');
      }
      
      const indexPath = join(distPath, 'index.html');
      if (existsSync(indexPath)) {
        return serveFile(indexPath, 'text/html');
      }
      
      const builtIndex = join(DIST_DIR, 'index.html');
      if (existsSync(builtIndex)) {
        return serveFile(builtIndex, 'text/html');
      }
      return new Response('Please run `bun run build` first', { status: 404 });
    },
  });
}

server();