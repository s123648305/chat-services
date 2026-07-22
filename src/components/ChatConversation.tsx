import { ReloadOutlined } from '@ant-design/icons';
import { Bubble, type BubbleListProps } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import '@ant-design/x-markdown/themes/light.css';
import dayjs from 'dayjs';
import { useMemo, type Ref } from 'react';
import type { ChatMessage } from './chatTypes';

type ChatConversationProps = {
  messages: ChatMessage[];
  historyLoading: boolean;
  loading: boolean;
  scrollRef: Ref<HTMLDivElement>;
  onRetry: (message: ChatMessage) => void;
};

const bubbleRoles: BubbleListProps['role'] = {
  user: {
    placement: 'end',
    variant: 'borderless',
    classNames: { content: 'message-bubble user' },
  },
  ai: {
    placement: 'start',
    variant: 'borderless',
    footerPlacement: 'outer-end',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: <div className="bubble-agent-avatar" aria-hidden="true"><span /></div>,
    classNames: {
      body: 'ai-message-body',
      content: 'message-bubble assistant',
    },
    contentRender: (content, info) => (
      <XMarkdown
        content={String(content ?? '')}
        rootClassName="x-markdown-light"
        openLinksInNewTab
        streaming={{
          hasNextChunk: info.status === 'updating',
          enableAnimation: true,
          animationConfig: {
            fadeDuration: 180,
            easing: 'ease-out',
          },
          tail: info.status === 'updating' ? { content: '●' } : false,
        }}
      />
    ),
  },
};

export default function ChatConversation({
  messages,
  historyLoading,
  loading,
  scrollRef,
  onRetry,
}: ChatConversationProps) {
  const bubbleItems = useMemo(() => {
    const items = messages.map((message) => {
      const streaming = message.status === 'streaming';
      const failed = message.status === 'error';
      const aborted = message.status === 'abort';

      return {
        key: message.id,
        role: message.role === 'assistant' ? 'ai' : 'user',
        content: message.content,
        loading: streaming && message.content.length === 0,
        streaming,
        status: failed
          ? 'error' as const
          : streaming
            ? 'updating' as const
            : aborted
              ? 'abort' as const
              : 'success' as const,
        ...(failed ? {
          footer: (
            <button
              type="button"
              className="message-retry-button"
              disabled={loading}
              onClick={() => onRetry(message)}
            >
              <ReloadOutlined />
              <span>重新发送</span>
            </button>
          ),
        } : {}),
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
  }, [historyLoading, loading, messages, onRetry]);

  const timeLabel = useMemo(() => dayjs().format('YYYY-MM-DD HH:mm'), []);

  return (
    <div className="chat-scroll" ref={scrollRef}>
      <div className="customer-message"><span>{timeLabel}</span></div>

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
  );
}
