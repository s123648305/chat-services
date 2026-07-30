import type {
  MessageCardData,
  WorkOrderCreatedCardData,
  WorkOrderDraftCardData,
} from './types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const firstString = (
  records: UnknownRecord[],
  keys: string[],
  fallback = '',
) => {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
  }
  return fallback;
};

function parseJsonContent(content: unknown): UnknownRecord | null {
  if (isRecord(content)) return content;
  if (typeof content !== 'string') return null;

  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];

  try {
    const parsed: unknown = JSON.parse(fenced ?? trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isWorkOrderType(value: string) {
  const normalized = value.toLowerCase().replace(/[\s_-]/g, '');
  return normalized.includes('工单')
    || normalized.includes('workorder')
    || normalized === 'ticket';
}

export function parseMessageCard(content: unknown): MessageCardData | null {
  const root = parseJsonContent(content);
  if (!root) return null;

  const nestedRecords = ['data', 'payload', 'card', 'workOrder']
    .map((key) => root[key])
    .filter(isRecord);
  const records = [root, ...nestedRecords];
  const type = firstString(records, ['type', 'messageType', 'cardType']);

  if (!isWorkOrderType(type)) return null;

  const status = firstString(
    records,
    ['status', 'subType', 'cardType', 'state'],
    'draft',
  ).toLowerCase();
  const orderNo = firstString(
    records,
    ['orderNo', 'orderId', 'workOrderNo', 'ticketNo', '工单号'],
  );
  const isCreated = [
    'created',
    'success',
    'submitted',
    '已创建',
    '已提交',
  ].some((value) => status.includes(value)) || Boolean(orderNo);

  if (isCreated) {
    const card: WorkOrderCreatedCardData = {
      kind: 'work-order-created',
      orderNo: orderNo || '工单已创建',
      category: firstString(
        records,
        ['category', 'serviceType', 'workOrderType', '服务类型'],
        '物业维修',
      ),
      progressText: firstString(
        records,
        ['progressText', 'progress', 'hint', '进度提示'],
        '点击查看进度',
      ),
      message: firstString(
        records,
        ['reply', 'message', 'description', 'tip'],
        '已由项目客服受理，你可以随时查看进度。还需要报其他问题吗？',
      ),
    };
    return card;
  }

  const card: WorkOrderDraftCardData = {
    kind: 'work-order-draft',
    serviceType: firstString(
      records,
      ['serviceType', 'category', 'workOrderType', '服务类型'],
      '待确认',
    ),
    project: firstString(records, ['project', 'projectName', '项目']),
    location: firstString(records, ['location', 'address', '位置']),
    description: firstString(
      records,
      ['description', 'problemDescription', 'issue', '问题描述'],
    ),
    contactName: firstString(
      records,
      ['contactName', 'contact', 'name', '联系人'],
    ),
    contactPhone: firstString(
      records,
      ['contactPhone', 'phone', 'mobile', '联系电话'],
    ),
    attachment: firstString(
      records,
      ['attachment', 'attachmentName', 'fileName', '附件'],
      '无',
    ),
    tip: firstString(
      records,
      ['tip', 'hint'],
      '此时未创建工单。点「确认提交」生成正式工单；「修改信息」进入确认页编辑。',
    ),
  };
  return card;
}
