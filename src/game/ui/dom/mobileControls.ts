export interface MobileControlsHandle {
  show(): void;
  hide(): void;
  setPauseState(paused: boolean): void;
  setFastForwardState(active: boolean): void;
  setEraseState(active: boolean): void;
  showSkipTutorialButton(): void;
  hideSkipTutorialButton(): void;
}
