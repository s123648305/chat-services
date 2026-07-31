import type {
  CustomerChatActivity,
  CustomerChatDebugEvent,
} from 'szdeepdata-worker-sdk';
import type { ChatAttachment } from '../hooks/useWorkerHub';

export type ChatMessageStatus = 'streaming' | 'success' | 'error' | 'abort';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  historical?: boolean;
  responseDelayed?: boolean;
  activity?: CustomerChatActivity;
  debugEvents?: CustomerChatDebugEvent[];
  status?: ChatMessageStatus;
  retryPayload?: {
    message: string;
    attachment: ChatAttachment | null;
    idempotencyKey: string;
  };
};
