import { Button } from 'antd';
import type {
  MessageCardAction,
  WorkOrderDraftCardData,
} from './types';

type WorkOrderDraftCardProps = {
  data: WorkOrderDraftCardData;
  disabled?: boolean;
  onAction?: (action: MessageCardAction, data: WorkOrderDraftCardData) => void;
};

export default function WorkOrderDraftCard({
  data,
  disabled = false,
  onAction,
}: WorkOrderDraftCardProps) {
  return (
    <div className="work-order-draft-wrap">
      <section className="work-order-draft-card">
        <header className="work-order-draft-header">
          <strong><span aria-hidden="true">📋</span> {data.title}</strong>
          <span className="work-order-ai-badge">{data.tag}</span>
        </header>

        <dl className="work-order-fields">
          {data.fields.map((field) => (
            <div className="work-order-field" key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value || '-'}</dd>
            </div>
          ))}
        </dl>

        <footer className="work-order-draft-actions">
          {data.actions.map((action) => (
            <Button
              block
              disabled={disabled}
              key={action.key}
              type={action.type === 'primary' ? 'primary' : 'default'}
              onClick={() => {
                onAction?.({
                  key: action.key,
                  label: action.label,
                  actionType: action.actionType,
                }, data);
              }}
            >
              {action.label}
            </Button>
          ))}
        </footer>
      </section>

      <p className="work-order-draft-tip">
        <span aria-hidden="true">ⓘ</span> {data.tip}
      </p>
    </div>
  );
}
