import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Bubble, type BubbleListProps } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import '@ant-design/x-markdown/themes/light.css';
import dayjs from 'dayjs';
import type {
  CustomerChatActivity,
  CustomerChatDebugEvent,
} from 'szdeepdata-worker-sdk';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { ChatMessage } from './chatTypes';
import { chatFeatureConfig } from '../config/chatFeatures';
import ThinkingStatus from './ThinkingStatus';
import {
  MessageCardRenderer,
  isStreamingJsonContent,
  parseMessageCard,
  type MessageCardAction,
  type MessageCardData,
} from './messageCards';

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
  onCardAction: (action: MessageCardAction, data: MessageCardData) => void;
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
  delayed: {
    placement: 'start',
    variant: 'borderless',
    avatar: aiAvatar,
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    classNames: {
      body: 'ai-message-body',
      content: 'message-bubble response-delayed',
    },
  },
  ai: (item) => {
    const isCard = Boolean(parseMessageCard(item.content));
    const cardContext = item.extraInfo as {
      activity?: CustomerChatActivity;
      debugEvents?: CustomerChatDebugEvent[];
      actionsDisabled?: boolean;
      onCardAction?: (
        action: MessageCardAction,
        data: MessageCardData,
      ) => void;
    } | undefined;

    return {
    placement: 'start',
    variant: 'borderless',
    footerPlacement: 'outer-end',
    styles: {
      root: { paddingInlineEnd: 0 },
    },
    avatar: aiAvatar,
    ...(item.status === 'updating' ? {
      loadingRender: () => (
        <ThinkingStatus
          activity={cardContext?.activity}
          debugEvents={cardContext?.debugEvents}
        />
      ),
    } : {}),
    classNames: {
      body: 'ai-message-body',
      content: isCard
        ? 'message-bubble assistant-card-bubble'
        : 'message-bubble assistant',
    },
    contentRender: (content, info) => (
      <div className="assistant-content-stack">
        {(
          Boolean(cardContext?.debugEvents?.length)
          || (
            info.status === 'updating'
            && Boolean(content)
            && cardContext?.activity
          )
        ) ? (
          <ThinkingStatus
            activity={cardContext?.activity}
            debugEvents={cardContext?.debugEvents}
            compact
            complete={info.status !== 'updating'}
          />
        ) : null}
        <MessageCardRenderer
          content={content}
          disabled={cardContext?.actionsDisabled}
          onAction={cardContext?.onCardAction}
          fallback={(
            info.status === 'updating'
            && isStreamingJsonContent(content)
          ) ? null : (
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
      </div>
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
  onCardAction,
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
      ...messages.flatMap((message) => {
        const streaming = message.status === 'streaming';
        const failed = message.status === 'error';
        const aborted = message.status === 'abort';

        const messageItem = {
          key: message.id,
          role: message.role === 'assistant' ? 'ai' : 'user',
          content: message.content,
          ...(message.role === 'assistant' ? {
            extraInfo: {
              activity: message.activity,
              debugEvents: message.debugEvents,
              actionsDisabled: loading,
              onCardAction,
            },
          } : {}),
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

        if (
          !chatFeatureConfig.responseDelay.enabled
          || !message.responseDelayed
        ) {
          return [messageItem];
        }

        return [
          messageItem,
          {
            key: `${message.id}-response-delayed`,
            role: 'delayed',
            content: (
              <div className="response-delayed-content">
                <ClockCircleOutlined aria-hidden="true" />
                <span>{chatFeatureConfig.responseDelay.message}</span>
              </div>
            ),
            typing: false,
            streaming: false,
            status: 'success' as const,
          },
        ];
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
  }, [
    historyLoading,
    loading,
    messages,
    onCardAction,
    onRetry,
    timeLabel,
  ]);

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
