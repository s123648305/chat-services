import { useRef, useState, type ReactNode, type UIEvent } from 'react';
import { parseMessageCards } from './parseMessageCard';
import type { MessageCardAction, MessageCardData } from './types';
import WorkOrderCreatedCard from './WorkOrderCreatedCard';
import WorkOrderDraftCard from './WorkOrderDraftCard';
import './messageCards.css';

type MessageCardRendererProps = {
  content: unknown;
  disabled?: boolean;
  fallback: ReactNode;
  onAction?: (action: MessageCardAction, data: MessageCardData) => void;
};

export default function MessageCardRenderer({
  content,
  disabled = false,
  fallback,
  onAction,
}: MessageCardRendererProps) {
  const cards = parseMessageCards(content);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (cards.length === 0) return fallback;

  const renderCard = (card: MessageCardData) => {
    if (card.kind === 'work-order-created') {
      return (
        <WorkOrderCreatedCard
          data={card}
          disabled={disabled}
          onAction={onAction}
        />
      );
    }

    return (
      <WorkOrderDraftCard
        data={card}
        disabled={disabled}
        onAction={onAction}
      />
    );
  };

  if (cards.length === 1) {
    return renderCard(cards[0]);
  }

  return (
    <section
      className="message-card-carousel"
      aria-label={`共 ${cards.length} 张卡片`}
    >
      <div className="message-card-carousel-summary">
        <span className="message-card-carousel-count">{cards.length} 张</span>
        <span>草稿卡片 · 独立状态独立提交</span>
      </div>

      <div
        ref={trackRef}
        className="message-card-carousel-track"
        onScroll={(event: UIEvent<HTMLDivElement>) => {
          const track = event.currentTarget;
          const slides = Array.from(track.children) as HTMLElement[];
          if (slides.length === 0) return;

          const closestIndex = slides.reduce((closest, slide, index) => (
            Math.abs(slide.offsetLeft - track.scrollLeft)
              < Math.abs(slides[closest].offsetLeft - track.scrollLeft)
              ? index
              : closest
          ), 0);
          setActiveIndex(closestIndex);
        }}
      >
        {cards.map((card, index) => (
          <div
            className="message-card-carousel-slide"
            key={card.kind === 'work-order-created'
              ? `${card.orderNo}-${index}`
              : `${card.title}-${index}`}
          >
            {renderCard(card)}
          </div>
        ))}
      </div>

      <div className="message-card-carousel-footer">
        <span>草稿 {activeIndex + 1}/{cards.length}</span>
        <span
          className="message-card-carousel-dots"
          aria-label={`当前第 ${activeIndex + 1} 张`}
        >
          {cards.map((_, index) => (
            <button
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              key={index}
              aria-label={`查看第 ${index + 1} 张卡片`}
              onClick={() => {
                const slide = trackRef.current?.children[index] as HTMLElement | undefined;
                slide?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                  inline: 'start',
                });
              }}
            />
          ))}
        </span>
        <span>← 滑动查看 →</span>
      </div>
    </section>
  );
}
