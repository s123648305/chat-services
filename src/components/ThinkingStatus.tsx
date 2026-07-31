import type {
  CustomerChatActivity,
  CustomerChatDebugEvent,
} from 'szdeepdata-worker-sdk';
import { Think } from '@ant-design/x';
import { useEffect, useMemo, useState } from 'react';
import { chatFeatureConfig } from '../config/chatFeatures';

type ThinkingStatusProps = {
  activity?: CustomerChatActivity;
  debugEvents?: CustomerChatDebugEvent[];
  compact?: boolean;
  complete?: boolean;
};

type DebugRow = {
  key: string;
  label: string;
  content: string;
};

function stringifyDebugValue(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildDebugRows(events: CustomerChatDebugEvent[]): DebugRow[] {
  let thinking = '';
  const rows: DebugRow[] = [];

  events.forEach((event, index) => {
    switch (event.type) {
      case 'thinking_delta':
        thinking += typeof event.delta === 'string'
          ? event.delta
          : stringifyDebugValue(event);
        break;
      case 'tool_execution_start':
        rows.push({
          key: `${event.type}-${index}`,
          label: `执行工具 · ${String(event.toolName ?? 'unknown')}`,
          content: stringifyDebugValue(event.args),
        });
        break;
      case 'tool_execution_update':
        rows.push({
          key: `${event.type}-${index}`,
          label: `工具更新 · ${String(event.toolName ?? 'unknown')}`,
          content: stringifyDebugValue(event.partialResult),
        });
        break;
      case 'tool_execution_end':
        rows.push({
          key: `${event.type}-${index}`,
          label: `${event.isError ? '工具失败' : '工具完成'} · ${String(event.toolName ?? 'unknown')}`,
          content: stringifyDebugValue(event.result),
        });
        break;
      case 'auto_retry_start':
        rows.push({
          key: `${event.type}-${index}`,
          label: `重试 · ${String(event.attempt ?? '-')}/${String(event.maxAttempts ?? '-')}`,
          content: stringifyDebugValue(event.errorMessage),
        });
        break;
      case 'compaction_start':
        rows.push({
          key: `${event.type}-${index}`,
          label: '整理上下文',
          content: stringifyDebugValue(event),
        });
        break;
      default:
        break;
    }
  });

  if (thinking) {
    rows.unshift({
      key: 'thinking',
      label: '思考',
      content: thinking,
    });
  }
  return rows;
}

function getActivityLabel(activity: CustomerChatActivity) {
  const labels = chatFeatureConfig.thinking.activityLabels;

  switch (activity.kind) {
    case 'thinking':
      return labels.thinking;

    case 'tool_executing':
      return activity.toolCount > 0
        ? `${labels.toolExecuting}（${activity.toolCount} 项）`
        : labels.toolExecuting;

    case 'retrying': {
      const hasAttempts = (
        typeof activity.attempt === 'number'
        && typeof activity.maxAttempts === 'number'
        && activity.attempt > 0
        && activity.maxAttempts > 0
      );
      return hasAttempts
        ? `正在重试（第 ${activity.attempt}/${activity.maxAttempts} 次）…`
        : labels.retrying;
    }

    case 'compacting':
      return labels.compacting;

    case 'generating':
    default:
      return labels.generating;
  }
}

export default function ThinkingStatus({
  activity,
  debugEvents = [],
  compact = false,
  complete = false,
}: ThinkingStatusProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const {
    displayMode,
    enabled,
    fallbackLabels,
    intervalMs,
  } = chatFeatureConfig.thinking;
  const debugRows = useMemo(
    () => buildDebugRows(debugEvents),
    [debugEvents],
  );

  useEffect(() => {
    if (!enabled || activity || fallbackLabels.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setFallbackIndex((current) => (current + 1) % fallbackLabels.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [activity, enabled, fallbackLabels.length, intervalMs]);

  if (!enabled) return null;

  const label = activity
    ? getActivityLabel(activity)
    : fallbackLabels[fallbackIndex] ?? fallbackLabels[0];

  if (displayMode === 'tip') {
    if (complete) return null;

    return (
      <div
        className={`thinking-status${compact ? ' is-compact' : ''}`}
        role="status"
        aria-live="polite"
      >
        <div className="thinking-tip">
          <span className="thinking-tip-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="thinking-tip-label" key={label}>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`thinking-status${compact ? ' is-compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <Think
        title={debugRows.length > 0 ? '思考' : label}
        loading={!complete ? (
          <span className="thinking-antx-loading" aria-hidden="true" />
        ) : false}
        blink={!complete}
        defaultExpanded
        classNames={{
          root: 'thinking-antx-root',
          content: 'thinking-antx-content',
        }}
      >
        {debugRows.length > 0 ? (
          <div className="thinking-debug-list">
            {debugRows.map((row) => (
              row.label === '思考' ? (
                <div className="thinking-debug-thought" key={row.key}>
                  {row.content}
                </div>
              ) : (
                <details className="thinking-debug-row" key={row.key}>
                  <summary>{row.label}</summary>
                  <pre>{row.content}</pre>
                </details>
              )
            ))}
          </div>
        ) : null}
      </Think>
    </div>
  );
}
