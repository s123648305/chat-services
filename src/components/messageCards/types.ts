export type MessageCardActionType = 'edit' | 'confirm' | 'view';

export type WorkOrderDraftCardData = {
  kind: 'work-order-draft';
  title: string;
  tag: string;
  fields: Array<{
    label: string;
    value: string;
  }>;
  actions: Array<{
    key: string;
    label: string;
    type: 'primary' | 'secondary';
    actionType: MessageCardActionType;
  }>;
  tip: string;
};

export type WorkOrderCreatedCardData = {
  kind: 'work-order-created';
  orderNo: string;
  statusText: string;
  category: string;
  progressText: string;
  message: string;
};

export type MessageCardData =
  | WorkOrderDraftCardData
  | WorkOrderCreatedCardData;

export type MessageCardAction = {
  key: string;
  label: string;
  actionType: MessageCardActionType;
};
