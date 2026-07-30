export const chatFeatureConfig = {
  composer: {
    showEmoji: true,
    showAttachmentUpload: false,
    supportText: 'DeepDataWorker 提供技术支持',
  },
  responseDelay: {
    enabled: true,
    timeoutMs: 30_000,
    message: 'AI 处理已超过 30 秒，可能仍在整理。你的输入已保留（非阻断，可继续等待或编辑后重发），或点右上角图标联系客服。',
  },
  thinking: {
    enabled: true,
    displayMode: 'tip' as 'think' | 'tip',
    intervalMs: 3_000,
    fallbackLabels: [
      '正在理解你的问题…',
      '正在检索星河智汇园知识库…',
      '正在整理答案…',
    ],
    activityLabels: {
      generating: '正在组织答案…',
      thinking: '正在分析问题…',
      toolExecuting: '正在执行工具…',
      retrying: '连接中断，正在重试…',
      compacting: '正在整理会话上下文…',
    },
  },
} as const;
