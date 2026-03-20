#!/usr/bin/env bun
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PLACEHOLDER_SITE = 'https://yoursite.com';
const PLACEHOLDER_FORMSPREE = 'YOUR_FORMSPREE_ID';
const PLACEHOLDER_SITE_NAME = 'My Site';
const PLACEHOLDER_AUTHOR = 'Site Author';

export interface SiteConfig {
  siteUrl: string;
  formspreeId: string;
  siteName: string;
  author: string;
}

export function loadConfig(): SiteConfig {
  const configPath = join(process.cwd(), 'site.config.json');
  
  if (!existsSync(configPath)) {
    console.warn('\n⚠️  Warning: site.config.json not found!');
    console.warn('   Creating default config with placeholder values.\n');
    return {
      siteUrl: PLACEHOLDER_SITE,
      formspreeId: PLACEHOLDER_FORMSPREE,
      siteName: PLACEHOLDER_SITE_NAME,
      author: PLACEHOLDER_AUTHOR,
    };
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as SiteConfig;
    
    const warnings: string[] = [];
    
    if (config.siteUrl === PLACEHOLDER_SITE) {
      warnings.push('siteUrl is still "https://yoursite.com"');
    }
    
    if (config.formspreeId === PLACEHOLDER_FORMSPREE) {
      warnings.push('formspreeId is still "YOUR_FORMSPREE_ID"');
    }
    
    if ((config.siteName || PLACEHOLDER_SITE_NAME) === PLACEHOLDER_SITE_NAME) {
      warnings.push('siteName is still "My Site"');
    }
    
    if ((config.author || PLACEHOLDER_AUTHOR) === PLACEHOLDER_AUTHOR) {
      warnings.push('author is still "Site Author"');
    }
    
    if (warnings.length > 0) {
      console.warn('\n⚠️  Warning: Configuration has placeholder values:');
      warnings.forEach(w => console.warn(`   - ${w}`));
      console.warn('   Update site.config.json before deploying.\n');
    }
    
    return {
      siteUrl: config.siteUrl || PLACEHOLDER_SITE,
      formspreeId: config.formspreeId || PLACEHOLDER_FORMSPREE,
      siteName: config.siteName || PLACEHOLDER_SITE_NAME,
      author: config.author || PLACEHOLDER_AUTHOR,
    };
  } catch (e) {
    console.error('\n❌ Error: Failed to read site.config.json');
    return {
      siteUrl: PLACEHOLDER_SITE,
      formspreeId: PLACEHOLDER_FORMSPREE,
      siteName: PLACEHOLDER_SITE_NAME,
      author: PLACEHOLDER_AUTHOR,
    };
  }
}

export function isPlaceholder(value: string, placeholder: string): boolean {
  return value === placeholder;
}

export const PLACEHOLDER_SITE_URL = PLACEHOLDER_SITE;
export const PLACEHOLDER_FORMSPREE_ID = PLACEHOLDER_FORMSPREE;