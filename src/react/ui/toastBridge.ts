import { hideToast, showToast } from '../stores/toastStore';

export interface ToastHandle {
  show(message: string, duration?: number): void;
  hide(): void;
}

export function createToastBridge(): ToastHandle {
  return {
    show(message: string, duration?: number) {
      showToast(message, duration);
    },
    hide() {
      hideToast();
    }
  };
}
