/**
 * Gets environment variable
 * Showcases: Nullish coalescing - elegant default value handling
 */
export function env(key: string, fallback?: string): string {
  // check for process in the node.js environment
  const value = (typeof process !== 'undefined' && process.env[key]) ?? fallback;
  if (!value) throw new Error(`${key} required`);
  return value;
}
