export interface MobileControlsCallbacks {
  onErase: () => void;
  onPause: () => void;
  onFastForward: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSkipTutorial: () => void;
}

export interface MobileControlsHandle {
  show(): void;
  hide(): void;
  setPauseState(paused: boolean): void;
  setFastForwardState(active: boolean): void;
  setEraseState(active: boolean): void;
  showSkipTutorialButton(): void;
  hideSkipTutorialButton(): void;
}
