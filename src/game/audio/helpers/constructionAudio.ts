export function stopConstructionLoop(game: any, colonist: any): void {
  if (!colonist) return;
  if (colonist.activeConstructionAudio && game?.audioManager) {
    game.audioManager.stop(colonist.activeConstructionAudio);
  }
  colonist.activeConstructionAudio = undefined;
}

export function stopConstructionAudio(game: any, colonist: any): void {
  stopConstructionLoop(game, colonist);
  if (!colonist) return;
  colonist.lastConstructionAudioTime = undefined;
}
