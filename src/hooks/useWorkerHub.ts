import {
  convertHistoryResponse,
  CustomerRelayClient,
} from '@szdeepdata/customer-relay-sdk';
import { useCallback, useEffect, useRef } from 'react';

type StreamHandlers = {
  onDelta: (text: string) => void;
  onFinal: (text: string) => void;
};

export type ChatAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type SendMessageOptions = {
  attachments?: ChatAttachment[];
  userInfo?: Record<string, unknown>;
  token?: string;
  role?: string;
  [key: string]: unknown;
};

export type WorkerHubHistoryMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type WorkerHubAgent = Record<string, unknown> & {
  agentId: string;
  name?: string;
  isDefault?: boolean;
};

const sessionStorageKey = 'worker-hub-session-key';

function createRelayUrl() {
  const url = new URL('/workerhub-relay', window.location.href);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildMessage(message:string,context:Record<string,unknown>){
  const data = {
    workerRelay:context,
    message
  }
  let jsrContext = message
   try {
    jsrContext = JSON.stringify(data)
   } catch (error) {

   }
   return jsrContext
}

function extractMessageText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  if (typeof value.text === 'string') return value.text;
  if (typeof value.content === 'string') return value.content;
  if (typeof value.deltaText === 'string') return value.deltaText;
  if (typeof value.message === 'string') return value.message;
  if (isRecord(value.content) && typeof value.content.text === 'string') {
    return value.content.text;
  }
  return '';
}

function extractUserDisplayText(text: string): string {
  const value = text.trim();
  if (!value.startsWith('{')) return text;

  try {
    const parsed: unknown = JSON.parse(value);
    if (isRecord(parsed) && typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Ordinary user text can start with "{" without being JSON.
  }

  return text;
}

function readHistoryMessages(response: unknown): WorkerHubHistoryMessage[] {
  const messages = convertHistoryResponse(response);
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role,
      content: message.role === 'user'
        ? extractUserDisplayText(message.text)
        : message.text,
    }));
}

function readAgents(response: unknown): WorkerHubAgent[] {
  const list = Array.isArray(response)
    ? response
    : isRecord(response)
      ? [response.agents, response.data, response.items].find(Array.isArray) ?? []
      : [];

  return list
    .filter(isRecord)
    .map((agent) => {
      const agentId = [agent.agentId, agent.id, agent.key]
        .find((value): value is string => typeof value === 'string' && value.length > 0);
      if (!agentId) return null;

      return {
        ...agent,
        agentId,
        ...(typeof agent.name === 'string' ? { name: agent.name } : {}),
        ...(typeof agent.isDefault === 'boolean' ? { isDefault: agent.isDefault } : {}),
      };
    })
    .filter((agent): agent is WorkerHubAgent => agent !== null);
}

function createClient() {
  return new CustomerRelayClient({
    url: createRelayUrl(),
    apiKey: __WORKER_HUB_API_KEY__,
    defaultTimeoutMs: 60_000,
  });
}

export function useWorkerHub() {
  const clientRef = useRef<CustomerRelayClient | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const chatSessionKeyPromiseRef = useRef<Promise<string> | null>(null);
  const relaySessionIdRef = useRef<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = createClient();
    }
    return clientRef.current;
  }, []);

  const resetClient = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    sessionPromiseRef.current = null;
    chatSessionKeyPromiseRef.current = null;
    relaySessionIdRef.current = null;
  }, []);

  const ensureChatSession = useCallback(() => {
    if (!sessionPromiseRef.current) {
      const client = getClient();
      sessionPromiseRef.current = (async () => {
        const relay = await client.openSession(__WORKER_HUB_WORKER_ID__);
        relaySessionIdRef.current = relay.relaySessionId;
        return relay.relaySessionId;
      })().catch((error) => {
        sessionPromiseRef.current = null;
        throw error;
      });
    }

    return sessionPromiseRef.current;
  }, [getClient]);

  const listAgents = useCallback(async () => {
    const client = getClient();
    const relaySessionId = await ensureChatSession();
    const response = await client.listAgents(relaySessionId);
    const agents = readAgents(response);

    console.info('[WorkerHub][listAgents] Agent 列表加载完成：', {
      agentIds: agents.map((agent) => agent.agentId),
      agents,
    });
    return agents;
  }, [ensureChatSession, getClient]);

  const getSessionKey = useCallback((relaySessionId: string) => {
    const existingSessionKey = window.localStorage.getItem(sessionStorageKey);
    if (existingSessionKey) return Promise.resolve(existingSessionKey);

    if (!chatSessionKeyPromiseRef.current) {
      const client = getClient();
      chatSessionKeyPromiseRef.current = client
        .createSession<Record<string, unknown>>(relaySessionId, { agentId: 'default' })
        .then((result) => {
          const sessionKey = [
            result.sessionKey,
            result.key,
            result.sessionId,
            result.id,
          ].find((value): value is string => typeof value === 'string' && value.length > 0);

          if (!sessionKey) {
            throw new Error('WorkerHub 创建会话成功，但未返回 sessionKey。');
          }

          window.localStorage.setItem(sessionStorageKey, sessionKey);
          console.info('[WorkerHub][createSession] 会话创建完成：', { sessionKey });
          return sessionKey;
        })
        .catch((error) => {
          chatSessionKeyPromiseRef.current = null;
          throw error;
        });
    }

    return chatSessionKeyPromiseRef.current;
  }, [getClient]);

  const initialize = useCallback(async () => {
    const client = getClient();
    console.info('[WorkerHub][initialize] 正在连接并加载历史会话…');

    try {
      const relaySessionId = await ensureChatSession();
      await listAgents();
      const sessionKey = await getSessionKey(relaySessionId);
      const response = await client.chatHistory(relaySessionId, { sessionKey });
      const history = readHistoryMessages(response);

      console.info('[WorkerHub][initialize] 历史会话加载完成：', {
        relaySessionId,
        messageCount: history.length,
      });
      return history;
    } catch (error) {
      console.error('[WorkerHub][initialize] 初始化或历史会话加载失败：', error);
      resetClient();
      throw error;
    }
  }, [ensureChatSession, getClient, getSessionKey, listAgents, resetClient]);

  const sendMessage = useCallback(async (
    message: string,
    handlers: StreamHandlers,
    options: SendMessageOptions = {},
  ) => {
    const client = getClient();
    console.info('[WorkerHub][sendMessage] 开始发送：', { message });

    try {
      const relaySessionId = await ensureChatSession();
      const sessionKey = await getSessionKey(relaySessionId);
      console.info('[WorkerHub][sendMessage] 会话初始化完成：', { relaySessionId });

      let settled = false;
      let timeout = 0;
      let resolvedRunId: string | undefined;
      let finishStream: (error?: Error) => void = () => {};

      const waitForStream = new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          if (error) reject(error);
          else resolve();
        };
        finishStream = finish;

        let unsubscribe = client.on('relay.event:chat', (event) => {
          if (!isRecord(event) || !isRecord(event.data)) return;

          const data = event.data;
          const runId = typeof data.runId === 'string' ? data.runId : undefined;
          if (resolvedRunId && runId && runId !== resolvedRunId) return;

          const state = typeof data.state === 'string' ? data.state : '';

          if (state === 'delta' && typeof data.deltaText === 'string') {
            console.info('[WorkerHub][sendMessage] 接收增量：', data.deltaText);
            handlers.onDelta(data.deltaText);
            return;
          }

          if (state === 'final') {
            const finalText = extractMessageText(data.message);
            console.info('[WorkerHub][sendMessage] 接收最终回复：', { finalText, raw: data });
            handlers.onFinal(finalText);
            unsubscribe();
            finish();
            return;
          }

          if (state === 'error' || data.error === true) {
            const errorText = extractMessageText(isRecord(data.error) ? data.error.message : data.error);
            console.error('[WorkerHub][sendMessage] 流式响应错误：', errorText || data);
            unsubscribe();
            finish(new Error(errorText || '生成失败'));
          }
        });

        timeout = window.setTimeout(() => {
          unsubscribe();
          finish(new Error('处理超时，请稍后重试。'));
        }, 120_000);
      });


      const requestPayload = {
        sessionKey,
        message: buildMessage(message,options),
      };
      console.info('[WorkerHub][sendMessage] 请求参数：', requestPayload);

      const result = await client.sendChat(
        relaySessionId,
        requestPayload,
        { timeoutMs: 60_000 },
      );
      const runId = isRecord(result) ? result.runId : undefined;
      if (typeof runId === 'string') {
        resolvedRunId = runId;
        console.info('[WorkerHub][sendMessage] SDK 已受理消息：', { runId });
      } else {
        const finalText = extractMessageText(result);
        console.info('[WorkerHub][sendMessage] SDK 已受理消息：', result);
        if (finalText) {
          handlers.onFinal(finalText);
          finishStream();
        }
      }

      await waitForStream;
      console.info('[WorkerHub][sendMessage] 本次消息处理完成。');
    } catch (error) {
      console.error('[WorkerHub][sendMessage] 通信失败：', error);
      resetClient();
      throw error;
    }
  }, [ensureChatSession, getClient, getSessionKey, resetClient]);

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

  return { initialize, listAgents, sendMessage };
}
