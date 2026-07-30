import { SmileOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { useState } from 'react';

const emojis = [
  '😀', '😄', '😊', '🥰', '😍', '🤔', '😎', '🥳',
  '😂', '😭', '😅', '😴', '😮', '😢', '😡', '🙏',
  '👍', '👎', '👏', '👌', '💪', '🤝', '👋', '❤️',
  '🎉', '✨', '🌹', '🔥', '✅', '💡', '📌', '🚀',
];

type EmojiPickerProps = {
  disabled?: boolean;
  onBeforeOpen?: () => void;
  onSelect: (emoji: string) => void;
};

export default function EmojiPicker({
  disabled = false,
  onBeforeOpen,
  onSelect,
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      arrow={false}
      content={(
        <div className="emoji-picker" aria-label="表情列表">
          {emojis.map((emoji) => (
            <button
              type="button"
              className="emoji-picker-item"
              key={emoji}
              aria-label={`插入表情 ${emoji}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      open={open}
      placement="top"
      trigger="click"
      onOpenChange={(nextOpen) => {
        if (!disabled) setOpen(nextOpen);
      }}
      overlayClassName="emoji-picker-popover"
    >
      <button
        type="button"
        disabled={disabled}
        aria-label="选择表情"
        aria-expanded={open}
        onPointerDown={(event) => {
          onBeforeOpen?.();
          event.preventDefault();
        }}
      >
        <SmileOutlined />
      </button>
    </Popover>
  );
}
