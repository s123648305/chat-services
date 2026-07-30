import { Button } from 'antd';
import type {
  MessageCardAction,
  WorkOrderDraftCardData,
} from './types';

type WorkOrderDraftCardProps = {
  data: WorkOrderDraftCardData;
  onAction?: (action: MessageCardAction, data: WorkOrderDraftCardData) => void;
};

export default function WorkOrderDraftCard({
  data,
  onAction,
}: WorkOrderDraftCardProps) {
  const fields = [
    ['服务类型', data.serviceType],
    ['项目', data.project],
    ['位置', data.location],
    ['问题描述', data.description],
    ['联系人', data.contactName],
    ['联系电话', data.contactPhone],
    ['附件', data.attachment],
  ];

  return (
    <div className="work-order-draft-wrap">
      <section className="work-order-draft-card">
        <header className="work-order-draft-header">
          <strong><span aria-hidden="true">📋</span> 服务草稿</strong>
          <span className="work-order-ai-badge">AI 识别</span>
        </header>

        <dl className="work-order-fields">
          {fields.map(([label, value]) => (
            <div className="work-order-field" key={label}>
              <dt>{label}</dt>
              <dd>{value || '-'}</dd>
            </div>
          ))}
        </dl>

        <footer className="work-order-draft-actions">
          <Button
            block
            onClick={() => onAction?.('edit', data)}
          >
            修改信息
          </Button>
          <Button
            block
            type="primary"
            onClick={() => onAction?.('confirm', data)}
          >
            确认提交
          </Button>
        </footer>
      </section>

      <p className="work-order-draft-tip">
        <span aria-hidden="true">ⓘ</span> {data.tip}
      </p>
    </div>
  );
}
