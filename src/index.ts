import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

// Transform stream to SSE lines - showcases TextDecoderStream
async function* toLines(stream: ReadableStream) {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) yield line;
  }
}

// Parse SSE data - showcases destructuring
function parseSSE(line: string) {
  if (!line.startsWith('data: ')) return;
  try {
    const { candidates: [{ content: { parts: [{ text }] } }] } = JSON.parse(line.slice(6));
    return text;
  } catch {}
}

// Stream response chunks - showcases async generators
async function* streamResponse(url: URL, contents: any[]) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });
  
  for await (const line of toLines(response.body!)) {
    const text = parseSSE(line);
    if (text) yield text;
  }
}

// Chat with history - showcases closure and Promise resolution
function chat(url: URL, prompt: string, prevHistory: any[] = []): [Promise<any[]>, AsyncGenerator<string>] {
  const contents = [...prevHistory, { role: 'user', parts: [{ text: prompt }] }];
  let response = '';
  let resolveHistory: (value: any[]) => void = () => {};
  
  const history = new Promise<any[]>(resolve => {
    resolveHistory = resolve;
  });
  
  const stream = (async function*() {
    for await (const chunk of streamResponse(url, contents)) {
      response += chunk;
      yield chunk;
    }
    resolveHistory([...contents, { role: 'model', parts: [{ text: response }] }]);
  })();
  
  return [history, stream];
}

// Ultra-minimal elegant REPL
async function repl(url: URL) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let history: any[] = [];
  
  for (;;) {
    const prompt = await rl.question('> ');
    if (!prompt) break;
    
    const [nextHistory, stream] = chat(url, prompt, history);
    
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    
    process.stdout.write('\n');
    history = await nextHistory;
  }
  
  rl.close();
}

function namespace(prefix = 'LLMI_', obj = process.env) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith(prefix)) {
      const subKey = key.slice(prefix.length);
      result[subKey] = value;
    }
  }
  return result;
}

const env = Object.freeze({
  key: process.env.GEMINI_API_KEY ?? (() => { throw new Error('GEMINI_API_KEY required') })(),
  alt: process.env.GEMINI_ALT ?? 'sse'
});

const model = (name: 'gemini-2.5-flash' | 'gemini-2.5-pro', method = 'streamGenerateContent', params = env) => 
  new URL(`?${new URLSearchParams(params)}`, 
    `https://generativelanguage.googleapis.com/v1beta/models/${name}:${method}`);

const url = model('gemini-2.5-flash');
await repl(url);
