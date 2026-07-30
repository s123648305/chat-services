import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CustomerChatActivity,
  CustomerChatDebugEvent,
} from '@szdeepdata/customer-relay-sdk';
import ChatComposer from './components/ChatComposer';
import ChatConversation, {
  type ChatConversationRef,
} from './components/ChatConversation';
import ChatHeader from './components/ChatHeader';
import type { ChatSettingsValue } from './components/ChatSettings';
import CurrentProjectHeader from './components/CurrentProjectHeader';
import type { ChatMessage } from './components/chatTypes';
import { chatFeatureConfig } from './config/chatFeatures';
import {
  handleMessageCardAction,
  type MessageCardAction,
  type MessageCardData,
} from './components/messageCards';
import {
  useWorkerHub,
  type ChatAttachment,
  type WorkerHubAgent,
  type WorkerHubWorker,
} from './hooks/useWorkerHub';
import { useVisualViewport } from './hooks/useVisualViewport';
const currentProjectName = '星河智汇园';
const baseUserInfo = {
  source: 'h5',
  token: 'token',
  phone: '15626881010',
  userName: '李四',
  projectName:currentProjectName
};

const initialSettings: ChatSettingsValue = {
  role: 'user',
  workerId: import.meta.env.VITE_WORKER_HUB_WORKERID,
  agentId: 'default',
};



function resolveAgentId(agents: WorkerHubAgent[], currentAgentId: string) {
  if (agents.some((agent) => agent.agentId === currentAgentId)) return currentAgentId;
  return agents.find((agent) => agent.isDefault)?.agentId
    ?? agents[0]?.agentId
    ?? currentAgentId;
}

export default function App() {
  // useVisualViewport();

  const conversationRef = useRef<ChatConversationRef>(null);
  const {
    cancelMessage: cancelWorkerHubMessage,
    initialize: initializeWorkerHub,
    listAgents: listWorkerHubAgents,
    listWorkers: listWorkerHubWorkers,
    sendMessage: sendWorkerHubMessage,
    setSessionContext,
  } = useWorkerHub();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agents, setAgents] = useState<WorkerHubAgent[]>([]);
  const [workers, setWorkers] = useState<WorkerHubWorker[]>([]);
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      initializeWorkerHub(),
      listWorkerHubAgents(),
      listWorkerHubWorkers(),
    ])
      .then(([history, nextAgents, nextWorkers]) => {
        if (!active) return;
        setMessages(history.map((message) => ({ ...message, historical: true })));
        setAgents(nextAgents);
        setWorkers(nextWorkers);
        setSettings((current) => ({
          ...current,
          agentId: resolveAgentId(nextAgents, current.agentId),
        }));
      })
      .catch((error: unknown) => {
        if (active) console.error('[App] 历史会话加载失败：', error);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initializeWorkerHub, listWorkerHubAgents, listWorkerHubWorkers]);

  const workerOptions = useMemo(() => {
    const options = workers.map((worker) => ({
      label: worker.displayName && worker.displayName !== worker.workerId
        ? `${worker.displayName} · ${worker.workerId}`
        : worker.workerId,
      value: worker.workerId,
    }));
    if (!options.some((option) => option.value === settings.workerId)) {
      options.unshift({ label: settings.workerId, value: settings.workerId });
    }
    return options;
  }, [settings.workerId, workers]);

  const agentOptions = useMemo(() => {
    const options = agents.map((agent) => ({
      label: agent.name && agent.name !== agent.agentId
        ? `${agent.name} · ${agent.agentId}`
        : agent.agentId,
      value: agent.agentId,
    }));
    if (!options.some((option) => option.value === 'default')) {
      options.unshift({ label: 'default', value: 'default' });
    }
    return options;
  }, [agents]);

  const updateAssistantMessage = (
    messageId: string,
    updateContent: (currentContent: string) => string,
    status?: ChatMessage['status'],
  ) => {
    setMessages((items) => items.map((message) => (
      message.id === messageId
        ? {
            ...message,
            content: updateContent(message.content),
            ...(status ? { status } : {}),
          }
        : message
    )));
  };

  const setAssistantResponseDelayed = (
    messageId: string,
    responseDelayed: boolean,
  ) => {
    setMessages((items) => items.map((message) => (
      message.id === messageId
        ? { ...message, responseDelayed }
        : message
    )));
  };

  const setAssistantActivity = (
    messageId: string,
    activity?: CustomerChatActivity,
  ) => {
    setMessages((items) => items.map((message) => (
      message.id === messageId
        ? { ...message, activity }
        : message
    )));
  };

  const appendAssistantDebugEvent = (
    messageId: string,
    debugEvent: CustomerChatDebugEvent,
  ) => {
    setMessages((items) => items.map((message) => (
      message.id === messageId
        ? {
            ...message,
            debugEvents: [...(message.debugEvents ?? []), debugEvent],
          }
        : message
    )));
  };

  const runAssistantRequest = async (
    assistantMessageId: string,
    requestMessage: string,
    selectedAttachment: ChatAttachment | null,
    idempotencyKey: string,
  ) => {
    setLoading(true);
    let responseStarted = false;
    const responseDelayTimer = chatFeatureConfig.responseDelay.enabled
      ? window.setTimeout(() => {
          if (!responseStarted) {
            setAssistantResponseDelayed(assistantMessageId, true);
          }
        }, chatFeatureConfig.responseDelay.timeoutMs)
      : null;

    const markResponseStarted = () => {
      if (responseStarted) return;
      responseStarted = true;
      if (responseDelayTimer !== null) {
        window.clearTimeout(responseDelayTimer);
      }
      setAssistantResponseDelayed(assistantMessageId, false);
    };

    try {
      await sendWorkerHubMessage(requestMessage, {
        onActivity: (activity) => {
          setAssistantActivity(assistantMessageId, activity);
        },
        onDebug: (debugEvent) => {
          appendAssistantDebugEvent(assistantMessageId, debugEvent);
        },
        onDelta: (text) => {
          markResponseStarted();
          updateAssistantMessage(assistantMessageId, (currentContent) => currentContent + text);
        },
        onFinal: (text) => {
          markResponseStarted();
          setAssistantActivity(assistantMessageId);
          updateAssistantMessage(
            assistantMessageId,
            (currentContent) => text || currentContent || '已收到回复。',
            'success',
          );
        },
        onAbort: () => {
          markResponseStarted();
          setAssistantActivity(assistantMessageId);
          updateAssistantMessage(
            assistantMessageId,
            (currentContent) => currentContent || '已停止生成。',
            'abort',
          );
        },
      }, {
        idempotencyKey,
        userInfo: {
          ...baseUserInfo,
          role: settings.role,
        },
        ...(selectedAttachment ? { attachments: [selectedAttachment] } : {}),
      });
    } catch (error) {
      markResponseStarted();
      setAssistantActivity(assistantMessageId);
      console.error('[App] 消息发送失败：', error);
      updateAssistantMessage(
        assistantMessageId,
        () => '抱歉，消息发送失败，请稍后重试。',
        'error',
      );
    } finally {
      if (responseDelayTimer !== null) {
        window.clearTimeout(responseDelayTimer);
      }
      setLoading(false);
    }
  };

  const retryMessage = async (message: ChatMessage) => {
    if (loading || historyLoading || !message.retryPayload) return;

    setMessages((items) => items.map((item) => (
      item.id === message.id
        ? {
            ...item,
            content: '',
            activity: undefined,
            debugEvents: undefined,
            responseDelayed: false,
            status: 'streaming',
          }
        : item
    )));

    await runAssistantRequest(
      message.id,
      message.retryPayload.message,
      message.retryPayload.attachment,
      message.retryPayload.idempotencyKey,
    );
  };

  const submitQuestion = async (
    question: string,
    selectedAttachment: ChatAttachment | null,
  ) => {
    const content = question.trim();
    if ((!content && !selectedAttachment) || loading || historyLoading) return;

    const displayContent = content || `附件：${selectedAttachment?.name ?? ''}`;
    const requestMessage = content || '请查看附件并回复。';
    const requestId = crypto.randomUUID();
    const assistantMessageId = `assistant-${requestId}`;

    setMessages((items) => [
      ...items,
      { id: `user-${requestId}`, role: 'user', content: displayContent },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        retryPayload: {
          message: requestMessage,
          attachment: selectedAttachment,
          idempotencyKey: requestId,
        },
      },
    ]);

    await runAssistantRequest(
      assistantMessageId,
      requestMessage,
      selectedAttachment,
      requestId,
    );
  };

  const applySettings = async (nextSettings: ChatSettingsValue) => {
    const workerChanged = nextSettings.workerId !== settings.workerId;
    const normalizedSettings = {
      ...nextSettings,
      agentId: workerChanged ? 'default' : nextSettings.agentId,
    };
    const contextChanged = setSessionContext(
      normalizedSettings.workerId,
      normalizedSettings.agentId,
    );
    setSettings(normalizedSettings);

    if (!contextChanged) return;

    setHistoryLoading(true);
    setMessages([]);
    try {
      const [history, nextAgents, nextWorkers] = await Promise.all([
        initializeWorkerHub(),
        listWorkerHubAgents(),
        listWorkerHubWorkers(),
      ]);
      setMessages(history.map((message) => ({ ...message, historical: true })));
      setAgents(nextAgents);
      setWorkers(nextWorkers);
      setSettings((current) => ({
        ...current,
        agentId: resolveAgentId(nextAgents, current.agentId),
      }));
    } catch (error) {
      console.error('[App] 切换会话配置失败：', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="物业助手在线客服">
        {/* <ChatHeader
          settings={settings}
          workerOptions={workerOptions}
          agentOptions={agentOptions}
          settingsDisabled={loading || historyLoading}
          onSettingsChange={applySettings}
        /> */}
        <CurrentProjectHeader projectName={currentProjectName} />
        <ChatConversation
          ref={conversationRef}
          messages={messages}
          historyLoading={historyLoading}
          loading={loading}
          onRetry={(message) => {
            void retryMessage(message);
          }}
          onCardAction={(
            action: MessageCardAction,
            data: MessageCardData,
          ) => {
            void handleMessageCardAction(action, data, {
              sendMessage: (content) => submitQuestion(content, null),
            });
          }}
          onBottomStateChange={setShowScrollToBottom}
        />
        <ChatComposer
          loading={loading}
          historyLoading={historyLoading}
          showScrollToBottom={showScrollToBottom}
          onSubmit={submitQuestion}
          onCancel={() => {
            void cancelWorkerHubMessage();
          }}
          onScrollToBottom={() => {
            setShowScrollToBottom(false);
            conversationRef.current?.scrollToBottom();
          }}
        />
      </section>
    </main>
  );
}
