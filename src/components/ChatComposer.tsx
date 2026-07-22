import {
  PlusOutlined,
  SendOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { Sender, type PromptsItemType } from '@ant-design/x';
import { useRef, useState } from 'react';
import type { ChatAttachment } from '../hooks/useWorkerHub';
import PromptList from './promptsList';

type ChatComposerProps = {
  loading: boolean;
  historyLoading: boolean;
  onSubmit: (question: string, attachment: ChatAttachment | null) => void | Promise<void>;
  onCancel: () => void;
};

export default function ChatComposer({
  loading,
  historyLoading,
  onSubmit,
  onCancel,
}: ChatComposerProps) {
  const [inputValue, setInputValue] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = (question: string) => {
    const content = question.trim();
    if ((!content && !attachment) || loading || historyLoading) return;

    const selectedAttachment = attachment;
    setInputValue('');
    setAttachment(null);
    void onSubmit(content, selectedAttachment);
  };

  const promptClick = (data: PromptsItemType) => {
    submit(String(data.label ?? ''));
  };

  return (
    <footer className="chat-footer">
      <PromptList onItemClick={promptClick} />
      {attachment && (
        <div className="sender-attachment" role="status">
          <span className="sender-attachment-name" title={attachment.name}>
            📎 {attachment.name}
          </span>
          <button type="button" onClick={() => setAttachment(null)} aria-label="移除附件">×</button>
        </div>
      )}
      <input
        ref={fileInputRef}
        className="sender-file-input"
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            window.alert('附件不能超过 10MB');
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result !== 'string') return;
            setAttachment({
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              dataUrl: reader.result,
            });
          };
          reader.readAsDataURL(file);
        }}
      />
      <Sender
        className="chat-sender"
        value={inputValue}
        loading={loading}
        disabled={historyLoading}
        placeholder="请输入您想要咨询的问题"
        autoSize={{ minRows: 1, maxRows: 5 }}
        onChange={setInputValue}
        onSubmit={submit}
        onCancel={onCancel}
        suffix={(_, { components: { SendButton, LoadingButton } }) => (
          <div className="sender-actions">
            <button type="button" disabled={historyLoading || loading} aria-label="选择表情">
              <SmileOutlined />
            </button>
            <button
              type="button"
              disabled={historyLoading || loading}
              aria-label="上传附件"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusOutlined />
            </button>
            <span className="sender-divider" aria-hidden="true" />
            {loading ? (
              <LoadingButton
                className="sender-submit sender-loading"
                type="text"
                aria-label="停止生成"
              />
            ) : (
              <SendButton
                className="sender-submit"
                type="text"
                icon={<SendOutlined />}
                disabled={historyLoading || (!inputValue.trim() && !attachment)}
                aria-label="发送"
              />
            )}
          </div>
        )}
        footer={false}
      />
      <div className="sender-support-copy">DeepDataWorker提供技术支持</div>
    </footer>
  );
}
