import { ReloadOutlined } from '@ant-design/icons';
import { Bubble, type BubbleListProps } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import '@ant-design/x-markdown/themes/light.css';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import type { ChatMessage } from './chatTypes';

type ChatConversationProps = {
  messages: ChatMessage[];
  historyLoading: boolean;
  loading: boolean;
  onRetry: (message: ChatMessage) => void;
};

const bubbleRoles: BubbleListProps['role'] = {
  time: {
    placement: 'start',
    variant: 'borderless',
    styles: {
      root: {
        justifyContent: 'center',
        paddingInlineEnd: 0,
      },
    },
    classNames: {
      content: 'time-message-content',
    },
    contentRender: (content) => (
      <div className="customer-message">{content}</div>
    ),
  },
  welcome: {
    placement: 'start',
    variant: 'borderless',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: <div className="bubble-agent-avatar" aria-hidden="true"><span /></div>,
    classNames: {
      body: 'ai-message-body',
      content: 'welcome-message-content',
    },
    contentRender: (content) => (
      <div className="welcome-bubble">{content}</div>
    ),
  },
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
  onRetry,
}: ChatConversationProps) {
  const timeLabel = useMemo(() => dayjs().format('YYYY-MM-DD HH:mm'), []);

  const bubbleItems = useMemo(() => {
    const items: BubbleListProps['items'] = [
      {
        key: 'conversation-time',
        role: 'time',
        content: <span>{timeLabel}</span>,
        typing: false,
      },
      {
        key: 'conversation-welcome',
        role: 'welcome',
        content: (
          <>
            <strong>▷ 我是你的物业管家！</strong>
            <span>欢迎咨询，竭诚为您服务，请问有什么可以帮您</span>
            <span className="sparkles">✨ ✨ ✨</span>
          </>
        ),
        typing: false,
      },
      ...messages.map((message) => {
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
      }),
    ];

    if (historyLoading && messages.length === 0) {
      items.push({
        key: 'history-loading',
        role: 'ai',
        content: '',
        loading: true,
        streaming: false,
        status: 'loading' as const,
        typing: false,
      });
    }

    return items;
  }, [historyLoading, loading, messages, onRetry, timeLabel]);

  return (
    <div className="chat-scroll">
      <Bubble.List
        className="message-list"
        items={bubbleItems}
        role={bubbleRoles}
        autoScroll
        aria-live="polite"
      />
    </div>
  );
}
