import { setHelpPanelVisible, toggleHelpPanel } from '../stores/helpPanelStore';

export interface HelpPanelHandle {
  show(): void;
  hide(): void;
  toggle(): void;
}

export function createHelpPanelBridge(): HelpPanelHandle {
  return {
    show() {
      setHelpPanelVisible(true);
    },
    hide() {
      setHelpPanelVisible(false);
    },
    toggle() {
      toggleHelpPanel();
    }
  };
}
