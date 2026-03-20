export const SITE_URL = 'https://yoursite.com';
export const FORMSPREE_ID = 'YOUR_FORMSPREE_ID';
export const SITE_NAME = 'StaticPress';
export const AUTHOR = 'Site Author';

export function isProduction(): boolean {
  return SITE_URL !== 'https://yoursite.com' && !SITE_URL.includes('localhost');
}