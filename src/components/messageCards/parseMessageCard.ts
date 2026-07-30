import type {
  MessageCardData,
  WorkOrderCreatedCardData,
  WorkOrderDraftCardData,
} from './types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

function normalizeActionType(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase();
  if (['edit', 'modify', 'update'].some((key) => normalized.includes(key))) {
    return 'edit' as const;
  }
  if (['submit', 'confirm', 'create'].some((key) => normalized.includes(key))) {
    return 'confirm' as const;
  }
  if (['view', 'detail', 'progress'].some((key) => normalized.includes(key))) {
    return 'view' as const;
  }
  return undefined;
}

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

function parseJsonContent(content: unknown): unknown {
  if (isRecord(content) || Array.isArray(content)) return content;
  if (typeof content !== 'string') return null;

  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];

  try {
    return JSON.parse(fenced ?? trimmed);
  } catch {
    return null;
  }
}

export function isStreamingJsonContent(content: unknown): boolean {
  if (typeof content !== 'string') return false;

  const normalized = content
    .trimStart()
    .replace(/^```(?:json)?\s*/i, '');
  return normalized.startsWith('{') || normalized.startsWith('[');
}

function isWorkOrderType(value: string) {
  const normalized = value.toLowerCase().replace(/[\s_-]/g, '');
  return normalized.includes('工单')
    || normalized.includes('workorder')
    || normalized === 'ticket'
    || normalized === 'servicedraft'
    || normalized === 'serviceorder'
    || normalized === 'servicecreated'
    || normalized === 'servicesuccess';
}

function parseFields(records: UnknownRecord[]) {
  for (const record of records) {
    if (!Array.isArray(record.fields)) continue;

    const fields = record.fields.flatMap((field) => {
      if (!isRecord(field)) return [];
      const label = typeof field.label === 'string' ? field.label.trim() : '';
      const value = typeof field.value === 'string' || typeof field.value === 'number'
        ? String(field.value).trim()
        : '';
      return label ? [{ label, value }] : [];
    });

    if (fields.length > 0) return fields;
  }
  return [];
}

function parseActions(records: UnknownRecord[]) {
  for (const record of records) {
    if (!Array.isArray(record.actions)) continue;

    const actions = record.actions.flatMap((action) => {
      if (!isRecord(action)) return [];
      const key = typeof action.key === 'string' ? action.key.trim() : '';
      const label = typeof action.label === 'string' ? action.label.trim() : '';
      if (!key || !label) return [];
      const actionType = normalizeActionType(action.actionType)
        ?? normalizeActionType(action.intent)
        ?? normalizeActionType(key);
      if (!actionType) return [];

      return [{
        key,
        label,
        type: action.type === 'primary' ? 'primary' as const : 'secondary' as const,
        actionType,
      }];
    });

    if (actions.length > 0) return actions;
  }
  return [];
}

function parseMessageCardRecord(root: UnknownRecord): MessageCardData | null {
  const nestedRecords = ['data', 'payload', 'card', 'workOrder', 'order']
    .map((key) => root[key])
    .filter(isRecord);
  const records = [root, ...nestedRecords];
  const type = firstString(records, ['type', 'messageType', 'cardType']);

  if (!isWorkOrderType(type)) return null;

  const status = firstString(
    records,
    ['status', 'subType', 'cardType', 'state'],
    type,
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
    const viewAction = parseActions(records)
      .find((action) => action.actionType === 'view');
    const card: WorkOrderCreatedCardData = {
      kind: 'work-order-created',
      orderNo: orderNo || '工单已创建',
      statusText: firstString(
        records,
        ['statusText', 'tag', 'status'],
        '待受理',
      ),
      category: firstString(
        records,
        ['category', 'serviceType', 'workOrderType', '服务类型'],
        '物业维修',
      ),
      progressText: firstString(
        records,
        ['progressText', 'progress', 'hint', '进度提示'],
        viewAction?.label || '点击查看进度',
      ),
      message: firstString(
        records,
        ['reply', 'message', 'description', 'note', 'tip'],
        '已由项目客服受理，你可以随时查看进度。还需要报其他问题吗？',
      ),
    };
    return card;
  }

  const structuredFields = parseFields(records);
  const fields = structuredFields.length > 0
    ? structuredFields
    : [
      {
        label: '服务类型',
        value: firstString(
          records,
          ['serviceType', 'category', 'workOrderType', '服务类型'],
          '待确认',
        ),
      },
      {
        label: '项目',
        value: firstString(records, ['project', 'projectName', '项目']),
      },
      {
        label: '位置',
        value: firstString(records, ['location', 'address', '位置']),
      },
      {
        label: '问题描述',
        value: firstString(
          records,
          ['description', 'problemDescription', 'issue', '问题描述'],
        ),
      },
      {
        label: '联系人',
        value: firstString(
          records,
          ['contactName', 'contact', 'name', '联系人'],
        ),
      },
      {
        label: '联系电话',
        value: firstString(
          records,
          ['contactPhone', 'phone', 'mobile', '联系电话'],
        ),
      },
      {
        label: '附件',
        value: firstString(
          records,
          ['attachment', 'attachmentName', 'fileName', '附件'],
          '无',
        ),
      },
    ];
  const structuredActions = parseActions(records);

  const card: WorkOrderDraftCardData = {
    kind: 'work-order-draft',
    title: firstString(records, ['title'], '服务草稿'),
    tag: firstString(records, ['tag'], 'AI 识别'),
    fields,
    actions: structuredActions.length > 0
      ? structuredActions
      : [
        {
          key: 'edit',
          label: '修改信息',
          type: 'secondary',
          actionType: 'edit',
        },
        {
          key: 'submit',
          label: '确认提交',
          type: 'primary',
          actionType: 'confirm',
        },
      ],
    tip: firstString(
      records,
      ['note', 'tip', 'hint'],
      '此时未创建工单。点「确认提交」生成正式工单；「修改信息」进入确认页编辑。',
    ),
  };
  return card;
}

export function parseMessageCards(content: unknown): MessageCardData[] {
  const parsed = parseJsonContent(content);
  const values = Array.isArray(parsed) ? parsed : [parsed];

  return values.flatMap((value) => {
    if (!isRecord(value)) return [];
    const card = parseMessageCardRecord(value);
    return card ? [card] : [];
  });
}

export function parseMessageCard(content: unknown): MessageCardData | null {
  return parseMessageCards(content)[0] ?? null;
}
