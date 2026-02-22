import { env } from './utils';

/**
 * Builds API URL
 * Showcases: URL & URLSearchParams - modern URL building APIs
 */
export function url(
  model: string = 'gemini-2.5-flash-lite',
  key: string = env('GEMINI_API_KEY'),
  method: string = 'streamGenerateContent'
): URL {
  const params = new URLSearchParams({ key, alt: 'sse' });
  return new URL(
    `v1beta/models/${model}:${method}?${params}`,
    'https://generativelanguage.googleapis.com/'
  );
}
