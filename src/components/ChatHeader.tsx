import ChatSettings, {
  type ChatSettingsValue,
  type SettingOption,
} from './ChatSettings';

type ChatHeaderProps = {
  settings: ChatSettingsValue;
  workerOptions: SettingOption[];
  agentOptions: SettingOption[];
  settingsDisabled?: boolean;
  onSettingsChange: (value: ChatSettingsValue) => void | Promise<void>;
};

export default function ChatHeader({
  settings,
  workerOptions,
  agentOptions,
  settingsDisabled,
  onSettingsChange,
}: ChatHeaderProps) {
  return (
    <header className="chat-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <span>物业助手</span>
      </div>
      <div className="header-actions">
        <ChatSettings
          value={settings}
          workerOptions={workerOptions}
          agentOptions={agentOptions}
          disabled={settingsDisabled}
          onApply={onSettingsChange}
        />
      </div>
    </header>
  );
}
