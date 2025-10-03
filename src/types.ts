export type Message = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};
