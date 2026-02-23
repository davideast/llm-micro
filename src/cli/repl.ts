import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Message } from '../types';
import { chat } from '../chat';
import { url } from '../gemini';
import { command, execute } from './commands';

/**
 * Writes stream to stdout
 * Showcases: For-await-of - seamless async iteration for I/O
 */
export async function write(source: AsyncIterable<string>): Promise<void> {
  for await (const chunk of source) {
    process.stdout.write(chunk);
  }
}

/**
 * Creates an AbortController with keyboard interrupt
 * Showcases: Event-driven patterns - stdin as event emitter for Ctrl+C detection
 */
export function interruptible(): AbortController {
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
export async function repl(url: URL): Promise<void> {
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
export function signals(): void {
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
