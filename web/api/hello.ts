import { chat, url, Message, toSSE, withAbort } from '../../src/index.js';
import { parseBody } from '../plugins/api.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

async function* streamSSE(
  source: AsyncIterable<string>,
  signal: AbortSignal,
  nextHistory: Promise<Message[]>
): AsyncGenerator<string> {
  try {
    for await (const chunk of withAbort(source, signal)) {
      yield toSSE({ chunk });
    }
    
    // Send updated history when done
    const updatedHistory = await nextHistory;
    yield toSSE({ done: true, history: updatedHistory });
  } catch (error) {
    yield toSSE({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') return res.writeHead(405).end();

  try {
    const body = await parseBody(req);
    const { input, history = [] } = body as { 
      input: string; 
      history?: Message[];
    };

    console.log('Received history length:', history.length);
    
    const [nextHistory, output] = chat(url(), input, history);

    const abort = new AbortController();
    req.once('close', () => abort.abort());

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    for await (const event of streamSSE(output, abort.signal, nextHistory)) {
      res.write(event);
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  } finally {
    res.end();
  }
};
