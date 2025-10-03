export type { Message } from './types';
export { chat, stream, lines, decode, sse, collect, tee, url } from './lib';

/**
 * Creates an AbortController with DOM event trigger (browser version)
 * Showcases: DOM Events - flexible event-driven abort pattern
 */
export function interruptible(
  target: EventTarget = document,
  eventType: string = 'keydown',
  predicate: (event: Event) => boolean = (e) => (e as KeyboardEvent).ctrlKey && (e as KeyboardEvent).key === 'c'
): AbortController {
  const controller = new AbortController();

  const handler = (event: Event) => {
    if (predicate(event)) {
      event.preventDefault();
      controller.abort();
      target.removeEventListener(eventType, handler);
    }
  };

  target.addEventListener(eventType, handler);

  // Cleanup on abort
  controller.signal.addEventListener('abort', () => {
    target.removeEventListener(eventType, handler);
  });

  return controller;
}
