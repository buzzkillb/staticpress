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
  if (SITE_URL === 'https://yoursite.com' || SITE_URL.includes('localhost')) {
    return false;
  }
  
  try {
    const url = new URL(SITE_URL);
    
    if (url.protocol !== 'https:') {
      return false;
    }
    
    const hostname = url.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    
    if (hostname.endsWith('.local')) {
      return false;
    }
    
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
      const parts = hostname.split('.').map(Number);
      if (parts[0] === 10 || 
          (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
          (parts[0] === 192 && parts[1] === 168) ||
          parts[0] === 127) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}