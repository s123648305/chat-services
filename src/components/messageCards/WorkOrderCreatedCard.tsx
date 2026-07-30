import { RightOutlined } from '@ant-design/icons';
import type {
  MessageCardAction,
  WorkOrderCreatedCardData,
} from './types';

type WorkOrderCreatedCardProps = {
  data: WorkOrderCreatedCardData;
  disabled?: boolean;
  onAction?: (action: MessageCardAction, data: WorkOrderCreatedCardData) => void;
};

export default function WorkOrderCreatedCard({
  data,
  disabled = false,
  onAction,
}: WorkOrderCreatedCardProps) {
  return (
    <div className="work-order-created-wrap">
      <button
        type="button"
        className="work-order-created-card"
        disabled={disabled}
        onClick={() => onAction?.({
          key: 'view',
          label: data.progressText,
          actionType: 'view',
        }, data)}
      >
        <span className="work-order-success-icon" aria-hidden="true">✓</span>
        <span className="work-order-created-copy">
          <strong>工单<br />{data.orderNo} 已创建</strong>
          <span>{data.statusText} · {data.category} · {data.progressText}</span>
        </span>
        <RightOutlined className="work-order-created-arrow" />
      </button>

      <p className="work-order-created-message">{data.message}</p>
    </div>
  );
}
