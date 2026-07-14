import {
  AudioFilled,
  LeftOutlined,
  PictureOutlined,
  RightOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  const [inputValue, setInputValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('sweeper');
  const [activeTab, setActiveTab] = useState('产品推荐');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [canScrollCategoryLeft, setCanScrollCategoryLeft] = useState(false);
  const [canScrollCategoryRight, setCanScrollCategoryRight] = useState(true);
  const categoryListRef = useRef<HTMLDivElement>(null);

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

  const submitQuestion = (question: string) => {
    const content = question.trim();
    if (!content || loading) return;

    setMessages((items) => [...items, { id: `user-${Date.now()}`, role: 'user', content }]);
    setInputValue('');
    setLoading(true);

    window.setTimeout(() => {
      setMessages((items) => [
        ...items,
        { id: `assistant-${Date.now()}`, role: 'assistant', content: buildReply(content) },
      ]);
      setLoading(false);
    }, 450);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(inputValue);
    }
  };

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="追觅科技在线客服">
        <header className="chat-header">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>追觅科技</span>
          </div>
          <div className="header-actions">
            <button type="button" aria-label="开启或关闭声音"><AudioFilled /></button>
            <button type="button" aria-label="最小化窗口">—</button>
          </div>
        </header>

        <div className="chat-scroll">
          {/* <div className="history-card">
            不同型号的清洁液自动添加功能和使用方法略有区别，<br />
            您对照对应视频操作就可以啦～
            <div className="feedback-row">
              <button type="button">👍&nbsp; 有用</button>
              <span />
              <button type="button">👎&nbsp; 没用</button>
            </div>
          </div> */}

          <div className="customer-message">您好，请问您有要咨询的问题吗</div>

          <div className="agent-row">
            <div className="agent-avatar" aria-hidden="true"><span /></div>
            <div className="agent-content">
              <div className="agent-name">小觅</div>
              <div className="welcome-bubble">
                <strong>▷ 梦想人生，值得追觅！</strong>
                <span>欢迎咨询小觅，小觅竭诚为您服务，请问有什么可以帮您</span>
                <span className="sparkles">✨ ✨ ✨</span>
              </div>
            </div>
          </div>

          <div className="agent-row category-row">
            <div className="agent-avatar" aria-hidden="true"><span /></div>
            <div className="agent-content category-content">
              <div className="agent-name">小觅</div>
              <div className="category-wrap">
                <button
                  className="carousel-arrow previous"
                  type="button"
                  aria-label="向前浏览"
                  disabled={!canScrollCategoryLeft}
                  onClick={() => scrollCategories('left')}
                >
                  <LeftOutlined />
                </button>
                <div
                  className="category-list"
                  ref={categoryListRef}
                  onScroll={updateCategoryScrollState}
                >
                  {productCategories.map((category) => (
                    <button
                      className={`category-card ${activeCategory === category.key ? 'active' : ''}`}
                      key={category.key}
                      type="button"
                      onClick={() => setActiveCategory(category.key)}
                    >
                      <span className={`product-icon product-${category.key}`}>{category.icon}</span>
                      <span>{category.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="carousel-arrow next"
                  type="button"
                  aria-label="向后浏览"
                  disabled={!canScrollCategoryRight}
                  onClick={() => scrollCategories('right')}
                >
                  <RightOutlined />
                </button>
              </div>
            </div>
          </div>

          <section className="guess-panel">
            <h2><span>🔥</span> 猜你想问：</h2>
            <div className="question-tabs">
              <LeftOutlined className="tab-arrow" />
              {questionTabs.map((tab) => (
                <button
                  className={activeTab === tab ? 'active' : ''}
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
              <RightOutlined className="tab-arrow last" />
            </div>
            <ol className="recommendation-list">
              {recommendationMap[activeTab].map((question, index) => (
                <li key={question}>
                  <button type="button" onClick={() => submitQuestion(question.replace(/^\S+\s/, ''))}>
                    <span className="rank">{index + 1}</span>
                    <span className="recommendation-text">{question}</span>
                    <RightOutlined />
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="message-list" aria-live="polite">
            {messages.map((message) => (
              <div className={`message-bubble ${message.role}`} key={message.id}>
                {message.content}
              </div>
            ))}
            {loading && <div className="message-bubble assistant">小觅正在整理答案…</div>}
          </section>
        </div>

        <footer className="chat-footer">
          {conversationEnded ? (
            <div className="ended-footer">
              <div className="ended-card">
                <span>对话已结束，您可以</span>
                <button type="button" onClick={() => setConversationEnded(false)}>继续咨询</button>
              </div>
              <div className="support-copy">DeepDataWorker提供技术支持</div>
            </div>
          ) : (
            <>
              <div className="bottom-actions">
                <button type="button" onClick={() => setConversationEnded(true)}>结束会话</button>
                <button type="button" onClick={() => submitQuestion('转人工客服')}>转人工</button>
              </div>
              <div className="composer">
                <div className="composer-tools">
                  <button type="button" aria-label="选择表情"><SmileOutlined /></button>
                  <button type="button" aria-label="上传图片"><PictureOutlined /></button>
                </div>
                <textarea
                  value={inputValue}
                  placeholder="请输入您想要咨询的问题"
                  rows={3}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  className="send-button"
                  type="button"
                  disabled={!inputValue.trim() || loading}
                  onClick={() => submitQuestion(inputValue)}
                >
                  <SendOutlined className="mobile-send-icon" />
                  <span>发送</span>
                </button>
                <div className="support-copy">DeepDataWorker提供技术支持</div>
              </div>
            </>
          )}
        </footer>
      </section>
    </main>
  );
}
