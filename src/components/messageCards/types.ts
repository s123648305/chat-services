export type WorkOrderDraftCardData = {
  kind: 'work-order-draft';
  serviceType: string;
  project: string;
  location: string;
  description: string;
  contactName: string;
  contactPhone: string;
  attachment: string;
  tip: string;
};

export type WorkOrderCreatedCardData = {
  kind: 'work-order-created';
  orderNo: string;
  category: string;
  progressText: string;
  message: string;
};

export type MessageCardData =
  | WorkOrderDraftCardData
  | WorkOrderCreatedCardData;

export type MessageCardAction = 'edit' | 'confirm' | 'view';
