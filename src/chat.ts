import { Message } from './types';
import { post } from './net';
import { sse } from './sse';
import { lines, decode, collect, tee } from './stream';

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
