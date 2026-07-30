import { message } from 'antd';
import type { MessageCardAction, MessageCardData } from './types';

type MessageCardActionContext = {
  sendMessage: (content: string) => void | Promise<void>;
};

export async function handleMessageCardAction(
  action: MessageCardAction,
  data: MessageCardData,
  context: MessageCardActionContext,
) {
  switch (action.actionType) {
    case 'edit':
      message.info('请在输入框中补充需要修改的信息');
      return;

    case 'confirm':
      await context.sendMessage('确认');
      return;

    case 'view':
      if (data.kind === 'work-order-created') {
        await context.sendMessage(`查询工单 ${data.orderNo} 进度`);
        return;
      }
      message.info('当前卡片暂不支持查看详情');
      return;

    default:
      message.info('暂不支持该操作');
  }
}
