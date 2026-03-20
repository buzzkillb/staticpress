#!/usr/bin/env bun
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { loadConfig } from './config';

const ROOT = process.cwd();
const DIST_DIR = join(ROOT, 'dist');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const PAGES_DIR = join(ROOT, 'src', 'content', 'pages');

const config = loadConfig();
const { siteUrl } = config;

function extractFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  if (!match) return { data: {}, body: content };

  const frontmatterStr = match[1] || '';
  const body = match[2] || '';

  try {
    const data = yaml.load(frontmatterStr) as Record<string, unknown> || {};
    return { data, body };
  } catch (e) {
    return { data: {}, body };
  }
}

function generateSitemap() {
  const urls: string[] = [
    `<url><loc>${siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${siteUrl}/blog/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
  ];

  if (existsSync(POSTS_DIR)) {
    const files = readdirSync(POSTS_DIR).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
        const { data } = extractFrontmatter(content);
        if (data.published !== false) {
          const slug = file.replace('.md', '');
          const lastmod = data.date ? new Date(data.date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
          urls.push(`<url><loc>${siteUrl}/blog/${slug}/</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
        }
      } catch (e) {}
    }
  }

  if (existsSync(PAGES_DIR)) {
    const files = readdirSync(PAGES_DIR).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = readFileSync(join(PAGES_DIR, file), 'utf-8');
        const { data } = extractFrontmatter(content);
        if (data.published !== false) {
          const slug = file.replace('.md', '');
          urls.push(`<url><loc>${siteUrl}/${slug}/</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
        }
      } catch (e) {}
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  writeFileSync(join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf-8');
  console.log('Generated sitemap.xml');
  
  const robots = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Security - keep admin and API private
Disallow: /admin/
Disallow: /api/`;

  writeFileSync(join(DIST_DIR, 'robots.txt'), robots, 'utf-8');
  console.log('Generated robots.txt');
}

generateSitemap();