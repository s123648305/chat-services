import { ReloadOutlined } from '@ant-design/icons';
import { Bubble, type BubbleListProps } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import '@ant-design/x-markdown/themes/light.css';
import dayjs from 'dayjs';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { ChatMessage } from './chatTypes';
import { MessageCardRenderer, parseMessageCard } from './messageCards';

export type ChatConversationRef = {
  scrollToBottom: () => void;
};

type BubbleListRef = {
  nativeElement: HTMLDivElement;
  scrollBoxNativeElement: HTMLDivElement;
  scrollTo: (options: {
    top?: number | 'bottom' | 'top';
    behavior?: ScrollBehavior;
  }) => void;
};

type ChatConversationProps = {
  messages: ChatMessage[];
  historyLoading: boolean;
  loading: boolean;
  onRetry: (message: ChatMessage) => void;
  onBottomStateChange: (awayFromBottom: boolean) => void;
};

const aiAvatar = (
  <img
    className="bubble-avatar-image"
    src="/ai.png"
    alt="AI 助手"
  />
);

const userAvatar = (
  <img
    className="bubble-avatar-image"
    src="/user.png"
    alt="用户"
  />
);

const bubbleRoles: BubbleListProps['role'] = {
  welcome: {
    placement: 'start',
    variant: 'borderless',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: aiAvatar,
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
    avatar: userAvatar,
    classNames: { content: 'message-bubble user' },
  },
  ai: (item) => {
    const isCard = Boolean(parseMessageCard(item.content));

    return {
    placement: 'start',
    variant: 'borderless',
    footerPlacement: 'outer-end',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: aiAvatar,
    classNames: {
      body: 'ai-message-body',
      content: isCard
        ? 'message-bubble assistant-card-bubble'
        : 'message-bubble assistant',
    },
    contentRender: (content, info) => (
      <MessageCardRenderer
        content={content}
        fallback={(
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
        )}
      />
    ),
    };
  },
};

const ChatConversation = forwardRef<ChatConversationRef, ChatConversationProps>(
function ChatConversation({
  messages,
  historyLoading,
  loading,
  onRetry,
  onBottomStateChange,
}, ref) {
  const bubbleListRef = useRef<BubbleListRef>(null);
  const timeLabel = useMemo(() => dayjs().format('YYYY-MM-DD HH:mm'), []);

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      bubbleListRef.current?.scrollTo({
        top: 'bottom',
        behavior: 'smooth',
      });
    },
  }), []);

  const bubbleItems = useMemo(() => {
    const items: BubbleListProps['items'] = [
      {
        key: 'conversation-welcome',
        role: 'welcome',
        content: (
          <>
            <strong>▷ 您好！我是星河智汇园的 AI 客服！</strong>
            <span>可以帮您咨询园区信息、报事报修、查询工单进度。请问有什么可以帮您？</span>
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
        ref={bubbleListRef}
        className="message-list"
        items={bubbleItems}
        role={bubbleRoles}
        autoScroll
        aria-live="polite"
        onScroll={(event) => {
          const scrollBox = event.currentTarget;
          const reverseScroll = window.getComputedStyle(scrollBox).flexDirection === 'column-reverse';
          const distanceToBottom = reverseScroll
            ? Math.abs(scrollBox.scrollTop)
            : scrollBox.scrollHeight - scrollBox.scrollTop - scrollBox.clientHeight;
          onBottomStateChange(distanceToBottom > 24);
        }}
      />
    </div>
  );
});

export default ChatConversation;
