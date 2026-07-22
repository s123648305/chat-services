import {
  AudioFilled,
  PlusOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Bubble, Sender, type BubbleListProps, type PromptsItemType } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import '@ant-design/x-markdown/themes/light.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkerHub, type ChatAttachment } from './hooks/useWorkerHub';
import SwitchRole from './components/switchRole';
import PromptList from './components/promptsList';
import dayjs from 'dayjs'

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  historical?: boolean;
};

const bubbleRoles: BubbleListProps['role'] = {
  user: {
    placement: 'end',
    variant: 'borderless',
    classNames: { content: 'message-bubble user' },
    styles: { },
  },
  ai: {
    placement: 'start',
    variant: 'borderless',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: <div className="bubble-agent-avatar" aria-hidden="true"><span /></div>,
    classNames: {
      body: 'ai-message-body',
      content: 'message-bubble assistant',
    },
    typing: {
      effect: 'typing',
      step: 2,
      interval: 24,
      keepPrefix: true,
    },
    contentRender: (content, info) => (
      <XMarkdown
        content={String(content ?? '')}
        rootClassName="x-markdown-light"
        openLinksInNewTab
        streaming={{
          hasNextChunk: info.status === 'updating',
          enableAnimation: false,
          tail: info.status === 'updating',
        }}
      />
    ),
  },
};

export default function App() {
  const { initialize: initializeWorkerHub, sendMessage: sendWorkerHubMessage } = useWorkerHub();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userInfo = {
    source:'h5',
    token: 'token',
    role: 'user',
  };


  const bubbleItems = useMemo(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');

    const items = messages.map((message) => {
      const streaming = loading
        && message.role === 'assistant'
        && message.id === lastAssistantMessage?.id;

      return {
        key: message.id,
        role: message.role === 'assistant' ? 'ai' : 'user',
        content: message.content,
        loading: streaming && message.content.length === 0,
        streaming,
        status: streaming ? 'updating' as const : 'success' as const,
        ...(message.historical ? { typing: false } : {}),
      };
    });

    if (historyLoading && items.length === 0) {
      return [{
        key: 'history-loading',
        role: 'ai',
        content: '',
        loading: true,
        streaming: false,
        status: 'loading' as const,
        typing: false,
      }];
    }

    return items;
  }, [historyLoading, loading, messages]);

  useEffect(() => {
    let active = true;

    initializeWorkerHub()
      .then((history) => {
        if (!active) return;
        setMessages(history.map((message) => ({ ...message, historical: true })));
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
  }, [initializeWorkerHub]);

  useEffect(() => {
    const chatScroll = chatScrollRef.current;
    if (!chatScroll) return;

    chatScroll.scrollTo({ top: chatScroll.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const updateAssistantMessage = (
    messageId: string,
    updateContent: (currentContent: string) => string,
  ) => {
    setMessages((items) => items.map((message) => (
      message.id === messageId
        ? { ...message, content: updateContent(message.content) }
        : message
    )));
  };

  const submitQuestion = async (question: string) => {
    const content = question.trim();
    if ((!content && !attachment) || loading || historyLoading) return;

    const selectedAttachment = attachment;
    const displayContent = content || `附件：${selectedAttachment?.name ?? ''}`;

    const requestId = crypto.randomUUID();
    const assistantMessageId = `assistant-${requestId}`;
    setMessages((items) => [
      ...items,
      { id: `user-${requestId}`, role: 'user', content: displayContent },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);
    setInputValue('');
    setAttachment(null);
    setLoading(true);

    try {
      await sendWorkerHubMessage(content || '请查看附件并回复。', {
        onDelta: (text) => {
          updateAssistantMessage(assistantMessageId, (currentContent) => currentContent + text);
        },
        onFinal: (text) => {
          updateAssistantMessage(
            assistantMessageId,
            (currentContent) => text || currentContent || '已收到回复。',
          );
        },
      }, {
        userInfo,
        ...(selectedAttachment ? { attachments: [selectedAttachment] } : {}),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      updateAssistantMessage(
        assistantMessageId,
        () => `抱歉，消息发送失败：${errorMessage}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const promptClick = (data: PromptsItemType) => {
    submitQuestion(String(data.label ?? ''));
  };

  const timeSpan = useMemo(()=><span>{dayjs().format('YYYY-MM-DD HH:MM')}</span>,[])

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="物业助手在线客服">
        <header className="chat-header">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>物业助手</span>
          </div>
          <div className="header-actions">
            <SwitchRole />
            <button type="button" aria-label="开启或关闭声音"><AudioFilled /></button>
            <button type="button" aria-label="最小化窗口">—</button>
          </div>
        </header>

        <div className="chat-scroll" ref={chatScrollRef}>
          <div className="customer-message">{timeSpan}</div>
          
          <div className="agent-row">
            <div className="agent-avatar" aria-hidden="true"><span /></div>
            <div className="agent-content">
              <div className="welcome-bubble">
                <strong>▷ 我是你的物业管家！</strong>
                <span>欢迎咨询，竭诚为您服务，请问有什么可以帮您</span>
                <span className="sparkles">✨ ✨ ✨</span>
              </div>
            </div>
          </div>

          <Bubble.List
            className="message-list"
            items={bubbleItems}
            role={bubbleRoles}
            autoScroll={false}
            aria-live="polite"
          />
        </div>

      <footer className="chat-footer">
        <PromptList onItemClick={promptClick}/>
        {attachment && (
          <div className="sender-attachment" role="status">
            <span className="sender-attachment-name" title={attachment.name}>📎 {attachment.name}</span>
            <button type="button" onClick={() => setAttachment(null)} aria-label="移除附件">×</button>
          </div>
        )}
        <input
          ref={fileInputRef}
          className="sender-file-input"
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              window.alert('附件不能超过 10MB');
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== 'string') return;
              setAttachment({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                dataUrl: reader.result,
              });
            };
            reader.readAsDataURL(file);
          }}
        />
        <Sender
            className="chat-sender"
            value={inputValue}
            loading={loading}
            disabled={historyLoading}
            placeholder="请输入您想要咨询的问题"
            autoSize={{ minRows: 1, maxRows: 5 }}
            onChange={setInputValue}
            onSubmit={submitQuestion}
            suffix={(_, { components: { SendButton } }) => (
              <div className="sender-actions">
                <button type="button" disabled={historyLoading} aria-label="选择表情">
                  <SmileOutlined />
                </button>
                <button
                  type="button"
                  disabled={historyLoading || loading}
                  aria-label="上传附件"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PlusOutlined />
                </button>
                <span className="sender-divider" aria-hidden="true" />
                <SendButton
                  className="sender-submit"
                  type="text"
                  icon={<SendOutlined />}
                  aria-label="发送"
                />
              </div>
            )}
            footer={false}
          />
          <div className="sender-support-copy">DeepDataWorker提供技术支持</div>
        </footer>
      </section>
    </main>
  );
}
