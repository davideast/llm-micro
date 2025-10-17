import { Message } from './types';

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
 * Creates abort-safe async iterator
 * Showcases: Signal integration - cancellation with AbortSignal
 */
export async function* withAbort<T>(
  source: AsyncIterable<T>,
  signal: AbortSignal
): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]();
  
  while (!signal.aborted) {
    const result = await iterator.next();
    if (result.done) break;
    yield result.value;
  }
}

/**
 * Appends final value to stream
 * Showcases: Generator delegation with manual yield
 */
export async function* append<T>(
  source: AsyncIterable<T>,
  final: T
): AsyncGenerator<T> {
  yield* source;
  yield final;
}

/**
 * Decodes a byte stream to text
 * Showcases: Web Streams API - TextDecoderStream for elegant encoding handling
 */
export async function* decode(stream: ReadableStream): AsyncGenerator<string> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Splits text stream into lines
 * Showcases: Generator functions - stateful iteration with closure over buffer
 */
export async function* lines(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  let buffer = '';
  
  for await (const chunk of chunks) {
    buffer += chunk;
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    
    for (const line of parts) {
      if (line.trim()) yield line;
    }
  }
  
  if (buffer.trim()) yield buffer;
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

/**
 * Makes HTTP POST request
 * Showcases: Fetch API - modern promise-based HTTP with clean options object
 */
export async function post(url: URL, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response;
}

/**
 * Streams API response
 * Showcases: Async generator delegation - yield* for elegant composition
 */
export async function* stream(url: URL, messages: Message[], signal?: AbortSignal): AsyncGenerator<string> {
  const response = await post(url, { contents: messages }, signal);
  
  if (!response.body) {
    throw new Error('Response body is null');
  }
  
  yield* sse(lines(decode(response.body)));
}

/**
 * Collects async values into array
 * Showcases: For-await-of loop - clean async iteration pattern
 */
export async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of source) {
    items.push(item);
  }
  return items;
}

/**
 * Splits async iterator into two
 * Showcases: Async generator protocol - manual iteration control with queues
 */
export function tee<T>(source: AsyncIterable<T>): [AsyncIterable<T>, AsyncIterable<T>] {
  const iterator = source[Symbol.asyncIterator]();
  const buffer: T[] = [];
  let done = false;
  let pending: Promise<void> | null = null;

  async function pullNext(): Promise<void> {
    if (done) return;

    const result = await iterator.next();
    if (result.done) {
      done = true;
    } else {
      buffer.push(result.value);
    }
  }

  async function* branch(): AsyncGenerator<T> {
    let index = 0;

    while (true) {
      // If we have buffered values, yield them
      if (index < buffer.length) {
        yield buffer[index++];
      } else if (done) {
        break;
      } else {
        // Ensure only one pull happens at a time
        if (!pending) {
          pending = pullNext();
        }

        await pending;
        pending = null;

        // After pulling, check if we got a value
        if (index < buffer.length) {
          yield buffer[index++];
        }
      }
    }
  }

  return [branch(), branch()];
}

/**
 * Creates a user message
 * Showcases: Object literal - concise object creation syntax
 */
function user(text: string): Message {
  return { role: 'user', parts: [{ text }] };
}

/**
 * Creates a model message
 * Showcases: Destructuring - elegant parameter handling
 */
function model(text: string): Message {
  return { role: 'model', parts: [{ text }] };
}

/**
 * Joins string array
 * Showcases: Array.join() - efficient string concatenation
 */
export function join(chunks: string[]): string {
  return chunks.join('');
}

/**
 * Chat with streaming and history
 * Showcases: Promise constructor - explicit promise creation for complex async coordination
 */
export function chat(
  url: URL,
  prompt: string,
  history: Message[] = [],
  signal?: AbortSignal
): [Promise<Message[]>, AsyncGenerator<string>] {
  const messages = [...history, user(prompt)];
  
  let resolve: (value: Message[]) => void;
  const promise = new Promise<Message[]>(r => { resolve = r; });
  
  async function* gen() {
    try {
      const source = stream(url, messages, signal);
      const [s1, s2] = tee(source);
      
      const chunks = collect(s2);
      yield* s1;
      
      const text = join(await chunks);
      resolve([...messages, model(text)]);
    } catch (error) {
      resolve(messages);
      throw error;
    }
  }
  
  return [promise, gen()];
}

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
