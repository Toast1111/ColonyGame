import { setMobileControlsState } from '../stores/mobileControlsStore';

export interface MobileControlsHandle {
  show(): void;
  hide(): void;
  setPauseState(paused: boolean): void;
  setFastForwardState(active: boolean): void;
  setEraseState(active: boolean): void;
  showSkipTutorialButton(): void;
  hideSkipTutorialButton(): void;
}

export function createMobileControlsBridge(): MobileControlsHandle {
  return {
    show() {
      setMobileControlsState({ visible: true });
    },
    hide() {
      setMobileControlsState({ visible: false });
    },
    setPauseState(paused: boolean) {
      setMobileControlsState({ paused });
    },
    setFastForwardState(active: boolean) {
      setMobileControlsState({ fastForwardActive: active });
    },
    setEraseState(active: boolean) {
      setMobileControlsState({ eraseActive: active });
    },
    showSkipTutorialButton() {
      setMobileControlsState({ showSkipTutorial: true });
    },
    hideSkipTutorialButton() {
      setMobileControlsState({ showSkipTutorial: false });
    }
  };
}
