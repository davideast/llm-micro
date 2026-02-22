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
