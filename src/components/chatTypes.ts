import type { ChatAttachment } from '../hooks/useWorkerHub';

export type ChatMessageStatus = 'streaming' | 'success' | 'error' | 'abort';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  historical?: boolean;
  status?: ChatMessageStatus;
  retryPayload?: {
    message: string;
    attachment: ChatAttachment | null;
  };
};
