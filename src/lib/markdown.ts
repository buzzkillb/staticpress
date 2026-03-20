import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import yaml from 'js-yaml';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

marked.setOptions({
  gfm: true,
  breaks: true,
});

const MAX_CONTENT_SIZE = 1024 * 1024; // 1MB limit

export function renderMarkdown(content: string): string {
  if (!content || content.length > MAX_CONTENT_SIZE) {
    return '<p>Content too large or empty</p>';
  }
  
  const html = marked.parse(content.slice(0, MAX_CONTENT_SIZE)) as string;
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'ul', 'ol', 'li', 
                   'blockquote', 'pre', 'code', 'em', 'strong', 'a', 'img', 'table', 'thead', 
                   'tbody', 'tr', 'th', 'td', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style'],
    FORBID_ATTR: ['srcdoc', 'onerror', 'onload', 'onclick', 'style'],
  } as any) as unknown as string;
}

export interface FrontmatterData {
  title?: string;
  date?: string;
  excerpt?: string;
  published?: boolean;
  [key: string]: any;
}

export interface ParsedContent {
  data: FrontmatterData;
  body: string;
}

export function extractFrontmatter(content: string): ParsedContent {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { data: {}, body: content };
  }
  
  const frontmatterStr = match[1] || '';
  const body = match[2] || '';
  
  try {
    const data = yaml.load(frontmatterStr, { schema: yaml.JSON_SCHEMA }) as FrontmatterData;
    return { data: data || {}, body };
  } catch (e) {
    console.error('YAML parse error:', e);
    return { data: {}, body };
  }
}

export function formatFrontmatter(data: Record<string, any>, body: string): string {
  const cleanData: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    cleanData[key] = value;
  }
  
  const yamlContent = yaml.dump(cleanData, { quotingType: '"', forceQuotes: true });
  
  return `---\n${yamlContent}---\n\n${body}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
