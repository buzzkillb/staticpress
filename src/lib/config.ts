import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const configPath = join(process.cwd(), 'site.config.json');

const defaultConfig = {
  siteUrl: 'https://yoursite.com',
  formspreeId: 'YOUR_FORMSPREE_ID',
  siteName: 'My Site',
  author: 'Site Author',
};

interface Config {
  siteUrl: string;
  formspreeId: string;
  siteName: string;
  author: string;
}

function loadFromFile(): Config {
  if (!existsSync(configPath)) {
    return defaultConfig;
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as Config;
  } catch {
    return defaultConfig;
  }
}

const config = loadFromFile();

export const SITE_URL = config.siteUrl;
export const FORMSPREE_ID = config.formspreeId;
export const SITE_NAME = config.siteName;
export const AUTHOR = config.author;

export function isProduction(): boolean {
  return SITE_URL !== 'https://yoursite.com' && !SITE_URL.includes('localhost');
}