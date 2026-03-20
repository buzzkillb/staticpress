import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(content: string): string {
  const html = marked.parse(content) as string;
  return purify.sanitize(html, {
    ADD_TAGS: ['iframe', 'style'],
    ADD_ATTR: ['target', 'srcdoc', 'class'],
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
  const data: FrontmatterData = {};
  
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();
    
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }
    
    data[key] = value;
  }
  
  return { data, body };
}

export function formatFrontmatter(data: Record<string, any>, body: string): string {
  const lines: string[] = ['---'];
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      if (value.includes('"') || value.includes('\n')) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`);
      } else {
        lines.push(`${key}: "${value}"`);
      }
    }
  }
  
  lines.push('---', '', body);
  
  return lines.join('\n');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
