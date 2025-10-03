import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Message } from './types';
import { chat, stream, lines, decode, sse, collect, tee, url, env, toSSE, asSSE, withAbort, append } from './lib';

/**
 * Extracts command from input
 * Showcases: String methods - startsWith and slice for simple parsing
 */
function command(input: string): string | null {
  if (!input.startsWith('/')) return null;
  return input.slice(1).toLowerCase();
}

/**
 * Executes REPL command
 * Showcases: Switch statement - clean branching for multiple cases
 */
function execute(cmd: string, history: Message[]): { continue: boolean; history?: Message[] } {
  switch (cmd) {
    case 'exit':
    case 'quit':
      return { continue: false };
      
    case 'clear':
      console.log('History cleared.\n');
      return { continue: true, history: [] };
      
    case 'history':
      console.log(`History: ${history.length} messages\n`);
      return { continue: true };
      
    case 'help':
      console.log('Commands:\n  /exit - quit\n  /clear - clear history\n  /history - show count\n');
      return { continue: true };
      
    default:
      console.log('Unknown command. Type /help for help.\n');
      return { continue: true };
  }
}

/**
 * Writes stream to stdout
 * Showcases: For-await-of - seamless async iteration for I/O
 */
async function write(source: AsyncIterable<string>): Promise<void> {
  for await (const chunk of source) {
    process.stdout.write(chunk);
  }
}

/**
 * Creates an AbortController with keyboard interrupt
 * Showcases: Event-driven patterns - stdin as event emitter for Ctrl+C detection
 */
function interruptible(): AbortController {
  const controller = new AbortController();
  
  const handler = (chunk: Buffer) => {
    // Ctrl+C = \x03
    if (chunk.toString() === '\x03') {
      controller.abort();
      stdin.off('data', handler);
    }
  };
  
  stdin.setRawMode?.(true);
  stdin.on('data', handler);
  
  // Cleanup on abort
  controller.signal.addEventListener('abort', () => {
    stdin.off('data', handler);
    stdin.setRawMode?.(false);
  });
  
  return controller;
}

/**
 * Interactive REPL loop
 * Showcases: Async/await - sequential async code that reads like sync
 */
async function repl(url: URL): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let history: Message[] = [];
  
  console.log('Chat started. Type /help for commands, /exit to quit.\n');
  console.log('Press Ctrl+C during generation to cancel.\n');
  
  try {
    while (true) {
      const input = await rl.question('> ');
      
      const cmd = command(input);
      if (cmd) {
        const result = execute(cmd, history);
        if (!result.continue) break;
        if (result.history) history = result.history;
        continue;
      }
      
      if (!input.trim()) continue;
      
      const controller = interruptible();
      
      try {
        const [next, output] = chat(url, input, history, controller.signal);
        await write(output);
        process.stdout.write('\n\n');
        history = await next;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('\n\nGeneration cancelled.\n');
        } else {
          console.error(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        }
      } finally {
        controller.abort(); // Cleanup
      }
    }
  } finally {
    rl.close();
  }
}

/**
 * Sets up signal handler
 * Showcases: Arrow functions - concise event handler syntax
 */
function signals(): void {
  process.on('SIGINT', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

/**
 * Main entry point
 * Showcases: Top-level await - clean async initialization
 */
async function main(): Promise<void> {
  signals();
  
  try {
    await repl(url());
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for library use
export {
  chat,
  stream,
  lines,
  decode,
  sse,
  collect,
  tee,
  url,
  env,
  toSSE,
  asSSE,
  withAbort,
  append,
  signals,
  repl,
  execute,
  command,
  write,
  interruptible,
  type Message
};
