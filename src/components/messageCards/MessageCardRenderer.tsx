import type { ReactNode } from 'react';
import { parseMessageCard } from './parseMessageCard';
import type { MessageCardAction, MessageCardData } from './types';
import WorkOrderCreatedCard from './WorkOrderCreatedCard';
import WorkOrderDraftCard from './WorkOrderDraftCard';
import './messageCards.css';

type MessageCardRendererProps = {
  content: unknown;
  fallback: ReactNode;
  onAction?: (action: MessageCardAction, data: MessageCardData) => void;
};

export default function MessageCardRenderer({
  content,
  fallback,
  onAction,
}: MessageCardRendererProps) {
  const card = parseMessageCard(content);
  if (!card) return fallback;

  if (card.kind === 'work-order-created') {
    return <WorkOrderCreatedCard data={card} onAction={onAction} />;
  }

  return <WorkOrderDraftCard data={card} onAction={onAction} />;
}
