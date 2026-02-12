import { useSyncExternalStore } from 'react';
import { getToastState, subscribeToast } from '../stores/toastStore';

export function Toast() {
  const state = useSyncExternalStore(subscribeToast, getToastState, getToastState);

  return (
    <div
      id="toast"
      style={{
        opacity: state.visible ? '1' : '0',
        pointerEvents: state.visible ? 'auto' : 'none'
      }}
    >
      {state.message}
    </div>
  );
}
