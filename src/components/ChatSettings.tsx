import { SettingOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Drawer, Input, Radio, Select } from 'antd';
import { useEffect, useState } from 'react';

export type ChatRole = 'user' | 'admin';

export type ChatSettingsValue = {
  role: ChatRole;
  workerId: string;
  agentId: string;
};

export type SettingOption = {
  label: string;
  value: string;
};

type ChatSettingsProps = {
  value: ChatSettingsValue;
  workerOptions: SettingOption[];
  agentOptions: SettingOption[];
  disabled?: boolean;
  onApply: (value: ChatSettingsValue) => void | Promise<void>;
};

export default function ChatSettings({
  value,
  workerOptions,
  agentOptions,
  disabled = false,
  onApply,
}: ChatSettingsProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [open, value]);

  const applySettings = async () => {
    if (!draft.workerId.trim() || !draft.agentId) return;

    setSaving(true);
    try {
      await onApply({ ...draft, workerId: draft.workerId.trim() });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="text"
        className="chat-settings-trigger"
        icon={<SettingOutlined />}
        disabled={disabled}
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        aria-label="打开会话设置"
      />

      <Drawer
        open={open}
        placement="bottom"
        title="会话设置"
        height={430}
        className="chat-settings-drawer"
        onClose={() => setOpen(false)}
        destroyOnHidden
      >
        <div className="chat-settings-form">
          <section className="chat-settings-field">
            <div className="chat-settings-label">
              <strong>当前角色</strong>
              <span>切换消息中携带的用户角色</span>
            </div>
            <Radio.Group
              block
              optionType="button"
              buttonStyle="solid"
              value={draft.role}
              options={[
                { label: '业主', value: 'user' },
                { label: '物业', value: 'admin' },
              ]}
              onChange={(event) => setDraft((current) => ({
                ...current,
                role: event.target.value as ChatRole,
              }))}
            />
          </section>

          <section className="chat-settings-field">
            <div className="chat-settings-label">
              <strong>Worker</strong>
              <span>选择或输入 Worker ID</span>
            </div>
            <AutoComplete
              value={draft.workerId}
              options={workerOptions}
              onChange={(workerId) => setDraft((current) => ({ ...current, workerId }))}
            >
              <Input placeholder="请输入 Worker ID" />
            </AutoComplete>
          </section>

          <section className="chat-settings-field">
            <div className="chat-settings-label">
              <strong>Agent</strong>
              <span>切换后会创建新的聊天会话</span>
            </div>
            <Select
              value={draft.agentId}
              options={agentOptions}
              showSearch
              optionFilterProp="label"
              placeholder="请选择 Agent"
              onChange={(agentId) => setDraft((current) => ({ ...current, agentId }))}
            />
          </section>

          <Button
            type="primary"
            block
            size="large"
            className="chat-settings-save"
            loading={saving}
            disabled={!draft.workerId.trim() || !draft.agentId}
            onClick={() => void applySettings()}
          >
            保存设置
          </Button>
        </div>
      </Drawer>
    </>
  );
}
