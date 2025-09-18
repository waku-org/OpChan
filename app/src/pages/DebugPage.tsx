import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import messageManager from '@opchan/core';
import { MessageType } from '@opchan/core';
import type { OpchanMessage } from '@opchan/core';

interface ReceivedMessage {
  receivedAt: number;
  message: OpchanMessage;
}

export default function DebugPage() {
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Subscribe to inbound messages from reliable channel
    unsubscribeRef.current = messageManager.onMessageReceived(msg => {
      setMessages(prev =>
        [{ receivedAt: Date.now(), message: msg }, ...prev].slice(0, 500)
      );
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const formatTs = (ts: number) => new Date(ts).toLocaleTimeString();

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of messages) {
      counts[item.message.type] = (counts[item.message.type] || 0) + 1;
    }
    return counts;
  }, [messages]);

  return (
    <div
      style={{
        padding: 16,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        color: '#e5e7eb',
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>Reliable Channel Debug</h2>
      <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
        Total received: {messages.length}
      </div>

      <div
        style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}
      >
        {Object.values(MessageType).map(t => (
          <div
            key={t}
            style={{
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 12,
              background: 'rgba(51,65,85,0.2)',
            }}
          >
            <strong style={{ textTransform: 'capitalize' }}>{t}</strong>:{' '}
            {typeCounts[t] || 0}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          borderTop: '1px solid #334155',
          paddingTop: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          Recent messages
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 120px 1fr 120px',
            gap: 8,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 700, color: '#cbd5e1' }}>Received</div>
          <div style={{ fontWeight: 700, color: '#cbd5e1' }}>Type</div>
          <div style={{ fontWeight: 700, color: '#cbd5e1' }}>ID / Author</div>
          <div style={{ fontWeight: 700, color: '#cbd5e1' }}>Msg Timestamp</div>
          {messages.map(m => (
            <Fragment key={`${m.message.id}:${m.receivedAt}`}>
              <div style={{ color: '#e5e7eb' }}>{formatTs(m.receivedAt)}</div>
              <div style={{ textTransform: 'capitalize', color: '#e5e7eb' }}>
                {m.message.type}
              </div>
              <div
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#e5e7eb',
                }}
                title={`${m.message.id} — ${m.message.author}`}
              >
                {m.message.id} —{' '}
                <span style={{ color: '#94a3b8' }}>{m.message.author}</span>
              </div>
              <div style={{ color: '#e5e7eb' }}>
                {formatTs(m.message.timestamp)}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
