import {
  AudioFilled,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Bubble, Sender, type BubbleListProps } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/dist/x-markdown.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkerHub } from './hooks/useWorkerHub';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  historical?: boolean;
};

type ProductCategory = {
  key: string;
  label: string;
  icon: string;
};

const productCategories: ProductCategory[] = [
  { key: 'sweeper', label: '扫地机', icon: '▥' },
  { key: 'scrubber', label: '洗地机', icon: '♧' },
  { key: 'vacuum', label: '吸尘器', icon: '⚯' },
  { key: 'purifier', label: '净水器', icon: '▣' },
  { key: 'kitchen', label: '大厨电', icon: '▥' },
  { key: 'small', label: '小家电', icon: '◫' },
];

const questionTabs = ['产品推荐', '会员福利', '上下水安装', '热门问题'];

const recommendationMap: Record<string, string[]> = {
  产品推荐: [
    '🔥 S60Pro超压旋风变速活水洗',
    '✨ X60Pro超压活水 净循无界',
    '🔥 S50Pro100℃热水洗智能旗舰',
    '✨ X50Pro增强版AI智能加压清扫',
  ],
  会员福利: [
    '🎁 新会员专享注册礼遇',
    '✨ 积分兑换与签到福利',
    '🔥 会员日限时加倍积分',
    '🎁 老用户焕新专属权益',
  ],
  上下水安装: [
    '🔧 上下水安装条件说明',
    '✨ 安装前需要预留多大空间',
    '💧 进水口与排水口位置要求',
    '📅 如何预约上门勘测安装',
  ],
  热门问题: [
    '🔥 扫地机如何选择适合的型号',
    '✨ 如何连接手机与家庭网络',
    '💧 清水箱和污水箱如何保养',
    '🛠️ 售后服务和保修政策',
  ],
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

function buildReply(question: string) {
  if (question.includes('安装') || question.includes('上下水')) {
    return '不同户型的清洁液自动添加功能和使用方法略有区别，您可以告诉我具体产品型号，我来为您提供对应的安装与使用说明～';
  }

  if (question.includes('会员') || question.includes('福利')) {
    return '追觅会员可享受积分兑换、会员日礼遇和新品福利。您可以告诉我想了解的具体权益，我会为您详细介绍～';
  }

  return `收到您的问题：“${question}”。请告诉我产品型号或具体使用场景，小觅会继续为您解答～`;
}

export default function App() {
  const { initialize: initializeWorkerHub, sendMessage: sendWorkerHubMessage } = useWorkerHub();
  const [inputValue, setInputValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('sweeper');
  const [activeTab, setActiveTab] = useState('产品推荐');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [canScrollCategoryLeft, setCanScrollCategoryLeft] = useState(false);
  const [canScrollCategoryRight, setCanScrollCategoryRight] = useState(true);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  const updateCategoryScrollState = () => {
    const categoryList = categoryListRef.current;
    if (!categoryList) return;

    const maxScrollLeft = categoryList.scrollWidth - categoryList.clientWidth;
    setCanScrollCategoryLeft(categoryList.scrollLeft > 2);
    setCanScrollCategoryRight(categoryList.scrollLeft < maxScrollLeft - 2);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const categoryList = categoryListRef.current;
    if (!categoryList) return;

    const firstCard = categoryList.querySelector<HTMLElement>('.category-card');
    const cardWidth = firstCard?.offsetWidth ?? 129;
    const gap = Number.parseFloat(window.getComputedStyle(categoryList).columnGap) || 12;

    categoryList.scrollBy({
      left: direction === 'left' ? -(cardWidth + gap) * 2 : (cardWidth + gap) * 2,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const categoryList = categoryListRef.current;
    if (!categoryList) return;

    updateCategoryScrollState();
    const resizeObserver = new ResizeObserver(updateCategoryScrollState);
    resizeObserver.observe(categoryList);

    return () => resizeObserver.disconnect();
  }, []);

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
    if (!content || loading || historyLoading) return;

    const requestId = crypto.randomUUID();
    const assistantMessageId = `assistant-${requestId}`;
    setMessages((items) => [
      ...items,
      { id: `user-${requestId}`, role: 'user', content },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);
    setInputValue('');
    setLoading(true);

    try {
      await sendWorkerHubMessage(content, {
        onDelta: (text) => {
          updateAssistantMessage(assistantMessageId, (currentContent) => currentContent + text);
        },
        onFinal: (text) => {
          updateAssistantMessage(
            assistantMessageId,
            (currentContent) => text || currentContent || '已收到回复。',
          );
        },
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

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="物业助手在线客服">
        <header className="chat-header">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>物业助手</span>
          </div>
          <div className="header-actions">
            <button type="button" aria-label="开启或关闭声音"><AudioFilled /></button>
            <button type="button" aria-label="最小化窗口">—</button>
          </div>
        </header>

        <div className="chat-scroll" ref={chatScrollRef}>
          <div className="customer-message">您好，请问您有要咨询的问题吗</div>
          
          <div className="agent-row">
            <div className="agent-avatar" aria-hidden="true"><span /></div>
            <div className="agent-content">
              <div className="welcome-bubble">
                <strong>▷ 我是你的物业管家！</strong>
                <span>欢迎咨询小觅，小觅竭诚为您服务，请问有什么可以帮您</span>
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
                <button type="button" disabled={historyLoading} aria-label="上传图片">
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
