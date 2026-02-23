import { Message } from '../types';

/**
 * Extracts command from input
 * Showcases: String methods - startsWith and slice for simple parsing
 */
export function command(input: string): string | null {
  if (!input.startsWith('/')) return null;
  return input.slice(1).toLowerCase();
}

/**
 * Executes REPL command
 * Showcases: Switch statement - clean branching for multiple cases
 */
export function execute(cmd: string, history: Message[]): { continue: boolean; history?: Message[] } {
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
