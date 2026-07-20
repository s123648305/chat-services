import {
  WorkerHubClient,
  type ChatMessage as WorkerHubChatMessage,
  type HttpRequestInput,
  type HttpRequestTransport,
  type HttpRequestTransportFactoryInput,
  type SocketCloseEvent,
  type SocketTransport,
  type SocketTransportFactoryInput,
} from '@workerHub';
import { useCallback, useEffect, useRef } from 'react';

type StreamHandlers = {
  onDelta: (text: string) => void;
  onFinal: (text: string) => void;
};

export type WorkerHubHistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const sessionStorageKey = 'worker-hub-session-key';

class BrowserSocketTransport implements SocketTransport {
  private socket?: WebSocket;
  private openHandler?: () => void;
  private messageHandler?: (message: string) => void;
  private closeHandler?: (event: SocketCloseEvent) => void;
  private errorHandler?: (error: unknown) => void;

  constructor(private readonly input: SocketTransportFactoryInput) {}

  connect() {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.input.url);
      this.socket = socket;

      socket.addEventListener('open', () => {
        console.info('[WorkerHub][WebSocket] 连接成功。');
        this.openHandler?.();
        resolve();
      });
      socket.addEventListener('message', async (event) => {
        const message = typeof event.data === 'string' ? event.data : await event.data.text();
        console.info('[WorkerHub][WebSocket] 接收帧：', message);
        this.messageHandler?.(message);
      });
      socket.addEventListener('close', (event) => {
        console.warn('[WorkerHub][WebSocket] 连接关闭：', {
          code: event.code,
          reason: event.reason,
        });
        this.closeHandler?.({ code: event.code, reason: event.reason });
      });
      socket.addEventListener('error', (event) => {
        console.error('[WorkerHub][WebSocket] 连接错误：', event);
        this.errorHandler?.(event);
        reject(new Error('WorkerHub WebSocket 连接失败。'));
      });
    });
  }

  send(message: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WorkerHub WebSocket 尚未连接。');
    }
    console.info('[WorkerHub][WebSocket] 发送帧：', message);
    this.socket.send(message);
  }

  close() {
    this.socket?.close(1000, 'closed by app');
  }

  onOpen(handler: () => void) {
    this.openHandler = handler;
  }

  onMessage(handler: (message: string) => void) {
    this.messageHandler = handler;
  }

  onClose(handler: (event: SocketCloseEvent) => void) {
    this.closeHandler = handler;
  }

  onError(handler: (error: unknown) => void) {
    this.errorHandler = handler;
  }
}

class BrowserRequestTransport implements HttpRequestTransport {
  constructor(private readonly input: HttpRequestTransportFactoryInput) {}

  async request<T>(request: HttpRequestInput): Promise<T> {
    const url = new URL(`${this.input.baseUrl}${request.path}`, window.location.origin);
    Object.entries(request.query ?? {}).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), request.timeoutMs ?? 30000);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: request.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`WorkerHub 请求失败（${response.status}）：${detail || response.statusText}`);
      }

      return (response.status === 204 ? undefined : await response.json()) as T;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

function createRelayUrl() {
  const url = new URL('/workerhub-relay', window.location.href);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function getSessionKey() {
  const existingSessionKey = window.sessionStorage.getItem(sessionStorageKey);
  if (existingSessionKey) return existingSessionKey;

  const sessionKey = `agent:main:web-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(sessionStorageKey, sessionKey);
  return sessionKey;
}

function readMessageText(message: WorkerHubChatMessage) {
  return message.content
    .filter((item) => item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHistoryContent(content: unknown) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((block) => {
      if (!isRecord(block)) return '';
      if (
        (block.type === 'text' || block.type === 'input_text' || block.type === 'output_text')
        && typeof block.text === 'string'
      ) {
        return block.text;
      }
      return '';
    })
    .join('');
}

function readHistoryMessages(response: unknown): WorkerHubHistoryMessage[] {
  if (!isRecord(response)) return [];

  const payload = isRecord(response.data) ? response.data : response;
  const entries = Array.isArray(payload.messages)
    ? payload.messages
    : Array.isArray(payload.entries)
      ? payload.entries
      : [];

  return entries.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const message = isRecord(entry.message) ? entry.message : entry;
    const role = message.role;
    if (role !== 'user' && role !== 'assistant') return [];

    const content = readHistoryContent(message.content);
    if (!content.trim()) return [];

    const rawId = message.id ?? entry.id ?? message.timestamp ?? entry.timestamp;
    return [{
      id: typeof rawId === 'string' || typeof rawId === 'number'
        ? `history-${String(rawId)}`
        : `history-${index}`,
      role,
      content,
    }];
  });
}

function createWorkerHubClient() {
  return new WorkerHubClient({
    relayUrl: createRelayUrl(),
    apiBaseUrl: '/workerhub-api',
    apiKey: '',
    workerId: __WORKER_HUB_WORKER_ID__,
    transportFactory: (input) => new BrowserSocketTransport(input),
    requestFactory: (input) => new BrowserRequestTransport(input),
  });
}

export function useWorkerHub() {
  const clientRef = useRef<WorkerHubClient | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = createWorkerHubClient();
    return clientRef.current;
  }, []);

  const resetClient = useCallback(() => {
    clientRef.current?.close();
    clientRef.current = null;
    sessionPromiseRef.current = null;
  }, []);

  const ensureChatSession = useCallback(() => {
    if (!sessionPromiseRef.current) {
      const client = getClient();
      sessionPromiseRef.current = (async () => {
        await client.connect();
        const agents = await client.listWorkerAgents();
        const agentId = agents.defaultAgentId ?? agents.agents[0]?.agentId ?? 'main';
        const session = await client.ensureSession({
          agentId,
          sessionKey: getSessionKey(),
          // label: '物业助手在线客服',
          metadata: { source: 'chat-services-web' },
        });
        await client.selectSession(session.key);
        return session.key;
      })().catch((error) => {
        sessionPromiseRef.current = null;
        throw error;
      });
    }

    return sessionPromiseRef.current;
  }, [getClient]);

  const initialize = useCallback(async () => {
    const client = getClient();
    console.info('[WorkerHub][initialize] 正在连接并加载历史会话…');

    try {
      const sessionKey = await ensureChatSession();
      const response = await client.requestCommand<unknown>('chat.history', { sessionKey });
      const history = readHistoryMessages(response);
      console.info('[WorkerHub][initialize] 历史会话加载完成：', {
        sessionKey,
        messageCount: history.length,
        response,
      });
      return history;
    } catch (error) {
      console.error('[WorkerHub][initialize] 初始化或历史会话加载失败：', error);
      resetClient();
      throw error;
    }
  }, [ensureChatSession, getClient, resetClient]);

  const sendMessage = useCallback(async (message: string, handlers: StreamHandlers) => {
    const client = getClient();
    console.info('[WorkerHub][sendMessage] 开始发送：', { message });

    try {
      console.info('[WorkerHub][sendMessage] 正在初始化会话…');
      const sessionKey = await ensureChatSession();
      console.info('[WorkerHub][sendMessage] 会话初始化完成：', { sessionKey });

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let timeout = 0;

        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          if (error) reject(error);
          else resolve();
        };

        timeout = window.setTimeout(
          () => finish(new Error('回复等待超时，请稍后重试。')),
          120000,
        );

        console.info('[WorkerHub][sendMessage] 正在提交消息…');
        client.sendMessage({
          sessionKey,
          message,
          onDelta: (text) => {
            console.info('[WorkerHub][sendMessage] 接收增量：', text);
            handlers.onDelta(text);
          },
          onFinal: (finalMessage) => {
            const text = readMessageText(finalMessage);
            console.info('[WorkerHub][sendMessage] 接收最终回复：', {
              text,
              rawMessage: finalMessage,
            });
            handlers.onFinal(text);
            finish();
          },
          onError: (error) => {
            console.error('[WorkerHub][sendMessage] 流式响应错误：', error);
            finish(error);
          },
        }).then((result) => {
          console.info('[WorkerHub][sendMessage] SDK 已受理消息：', result);
        }).catch((error: unknown) => {
          console.error('[WorkerHub][sendMessage] SDK 提交失败：', error);
          finish(error instanceof Error ? error : new Error(String(error)));
        });
      });
      console.info('[WorkerHub][sendMessage] 本次消息处理完成。');
    } catch (error) {
      console.error('[WorkerHub][sendMessage] 通信失败：', error);
      resetClient();
      throw error;
    }
  }, [ensureChatSession, getClient, resetClient]);

  useEffect(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    return () => {
      closeTimerRef.current = window.setTimeout(() => {
        resetClient();
        closeTimerRef.current = null;
      }, 0);
    };
  }, [resetClient]);

  return { initialize, sendMessage };
}
