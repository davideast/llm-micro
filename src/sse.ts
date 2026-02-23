/**
 * Formats data as SSE event
 * Showcases: Template literals - clean string interpolation
 */
export function toSSE(data: unknown, event?: string): string {
  return `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Transforms chunks to SSE format
 * Showcases: Generator mapping - simple transformation pipeline
 */
export async function* asSSE<T>(
  source: AsyncIterable<T>,
  transform: (value: T) => unknown = v => ({ chunk: v })
): AsyncGenerator<string> {
  for await (const value of source) {
    yield toSSE(transform(value));
  }
}

/**
 * Extracts data from SSE line
 * Showcases: String methods - simple, efficient string slicing
 */
export function data(line: string): string | undefined {
  if (!line.startsWith('data: ')) return;
  const content = line.slice(6);
  return content === '[DONE]' ? undefined : content;
}

/**
 * Parses JSON to extract text
 * Showcases: Optional chaining - safe nested property access
 */
export function parse(json: string): string | undefined {
  try {
    const obj = JSON.parse(json);
    return obj?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch {
    return undefined;
  }
}

/**
 * Transforms SSE lines to text chunks
 * Showcases: Generator composition - combining simple generators into complex behavior
 */
export async function* sse(source: AsyncIterable<string>): AsyncGenerator<string> {
  for await (const line of source) {
    const json = data(line);
    if (json) {
      console.log('SSE JSON:', json);
      const text = parse(json);
      console.log('Parsed text:', JSON.stringify(text));
      if (text) yield text;
    }
  }
}
