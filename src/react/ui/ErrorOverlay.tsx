import { useSyncExternalStore, type CSSProperties } from 'react';
import { clearErrorOverlay, getErrorOverlayState, subscribeErrorOverlay } from '../stores/errorOverlayStore';

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: '0 auto auto 0',
  maxWidth: '100%',
  zIndex: 99999,
  background: 'rgba(8,8,10,0.82)',
  color: '#fee2e2',
  fontSize: '12px',
  lineHeight: '1.4',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  padding: '10px',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  pointerEvents: 'auto'
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px'
};

const dismissStyle: CSSProperties = {
  marginLeft: 'auto',
  background: '#ef4444',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 8px',
  cursor: 'pointer'
};

export function ErrorOverlay() {
  const state = useSyncExternalStore(subscribeErrorOverlay, getErrorOverlayState, getErrorOverlayState);

  return (
    <div
      id="error-overlay"
      style={{
        ...overlayStyle,
        display: state.visible ? 'block' : 'none'
      }}
    >
      <div style={headerStyle}>
        <strong>Errors</strong>
        <button type="button" style={dismissStyle} onClick={() => clearErrorOverlay()}>
          Dismiss
        </button>
      </div>
      {state.messages.map((msg, index) => (
        <div key={`${index}-${msg}`}>{msg}</div>
      ))}
    </div>
  );
}
