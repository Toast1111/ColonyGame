import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { drawColonistAvatar } from '../game/render/sprites/colonistRenderer';
import {
  getGameOverOverlayState,
  subscribeGameOverOverlay
} from './creditsOverlayStore';

type MemorialCardProps = {
  colonist: any;
  size: number;
  nameFontSize: number;
  left: number;
  top: number;
  opacity: number;
  nameOffset: number;
};

function MemorialCard({ colonist, size, nameFontSize, left, top, opacity, nameOffset }: MemorialCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const avatarSize = size * 0.8;
    ctx.save();
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    try {
      drawColonistAvatar(ctx, size / 2, size / 2, colonist, avatarSize, false);
    } catch (error) {
      console.warn('[GameOver] Failed to draw colonist portrait', error);
    }

    try {
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const gray = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn('[GameOver] Failed to apply grayscale to portrait', error);
    }
  }, [colonist, size]);

  return (
    <div
      className="memorial-card"
      style={{ left: `${left}px`, top: `${top}px`, width: `${size}px`, opacity }}
    >
      <div className="memorial-frame" style={{ width: `${size}px`, height: `${size}px` }}>
        <canvas ref={canvasRef} className="memorial-canvas" />
        <div className="memorial-vignette" />
      </div>
      <div
        className="memorial-name"
        style={{ fontSize: `${nameFontSize}px`, marginTop: `${nameOffset}px` }}
      >
        {colonist?.profile?.name || 'Unknown'}
      </div>
    </div>
  );
}

export function GameOverOverlay() {
  const state = useSyncExternalStore(subscribeGameOverOverlay, getGameOverOverlayState, getGameOverOverlayState);

  if (!state.active || state.canvasHeight === 0) {
    return null;
  }

  const w = state.canvasWidth;
  const h = state.canvasHeight;

  const lineHeight = h * 0.15;
  const startY = h - state.scrollY + h * 0.2;
  const cullMargin = h * 0.15;
  const titleFontSize = Math.max(14, h * 0.028);
  const nameFontSize = Math.max(32, h * 0.064);
  const lineTopOffset = h * 0.11;

  const centerY = h * 0.35;
  const lineSpacing = h * 0.09;

  const photoSize = Math.min(100, h * 0.10);
  const spacing = photoSize * 0.25;
  const photosPerRow = Math.min(8, state.deadColonists.length || 1);
  const totalRows = Math.ceil(state.deadColonists.length / photosPerRow);
  const gridWidth = photosPerRow * (photoSize + spacing) - spacing;
  const gridHeight = totalRows * (photoSize + spacing) - spacing;
  const startX = (w - gridWidth) / 2;
  const startYMemorial = h * 0.65;
  const nameOffset = photoSize * 0.133;
  const memorialNameFontSize = Math.max(8, photoSize * 0.1);

  return (
    <div className="gameover-overlay">
      <div className="gameover-fade" style={{ opacity: state.fadeOpacity }} />

      {state.phase === 'guilt' && (
        <div className="gameover-guilt">
          {state.messages.map((msg, index) => {
            if (state.timeSinceFade < msg.delay) return null;
            const msgElapsed = state.timeSinceFade - msg.delay;
            const fadeIn = Math.min(1, msgElapsed / 0.5);
            const easedOpacity = fadeIn < 0.5
              ? 2 * fadeIn * fadeIn
              : 1 - Math.pow(-2 * fadeIn + 2, 2) / 2;
            const yOffset = (index - 1.5) * lineSpacing;
            const yPos = centerY + yOffset;

            let className = 'gameover-message gameover-message--soft';
            let fontSize = Math.max(20, h * 0.04);
            if (msg.text === 'EVERYONE' || msg.text === 'IS DEAD') {
              className = 'gameover-message gameover-message--loud';
              fontSize = Math.max(32, h * 0.07);
            } else if (msg.text === 'YOU FAILED THEM') {
              className = 'gameover-message gameover-message--accuse';
              fontSize = Math.max(28, h * 0.055);
            }

            return (
              <div
                key={msg.text}
                className={className}
                style={{ top: `${yPos}px`, opacity: easedOpacity, fontSize: `${fontSize}px` }}
              >
                {msg.text}
              </div>
            );
          })}

          {state.showMemorial && (
            <>
              {state.deadColonists.length === 0 ? (
                <div
                  className="memorial-empty"
                  style={{ fontSize: `${Math.max(12, h * 0.02)}px`, top: `${startYMemorial}px`, opacity: state.memorialOpacity }}
                >
                  (No fallen colonists to remember)
                </div>
              ) : (
                <div className="memorial-grid" style={{ opacity: state.memorialOpacity, width: `${gridWidth}px`, height: `${gridHeight}px`, left: `${startX}px`, top: `${startYMemorial}px` }}>
                  {state.deadColonists.map((colonist, i) => {
                    const row = Math.floor(i / photosPerRow);
                    const col = i % photosPerRow;
                    const left = col * (photoSize + spacing);
                    const top = row * (photoSize + spacing);

                    return (
                      <MemorialCard
                        key={colonist?.id ?? `${i}-${colonist?.profile?.name ?? 'colonist'}`}
                        colonist={colonist}
                        size={photoSize}
                        nameFontSize={memorialNameFontSize}
                        left={left}
                        top={top}
                        opacity={state.memorialOpacity}
                        nameOffset={nameOffset}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {state.phase === 'credits' && (
        <div className="credits-overlay">
          {state.credits.map((credit, index) => {
            const y = startY + index * lineHeight;
            if (y <= -cullMargin || y >= h + cullMargin) {
              return null;
            }

            return (
              <div
                key={`${credit.title}-${index}`}
                className="credits-entry"
                style={{ top: `${y}px` }}
              >
                <div
                  className="credits-title"
                  style={{ fontSize: `${titleFontSize}px` }}
                >
                  {credit.title}
                </div>
                <div
                  className="credits-name"
                  style={{ fontSize: `${nameFontSize}px` }}
                >
                  {credit.name}
                </div>
                <div
                  className="credits-line"
                  style={{ top: `${lineTopOffset}px` }}
                />
              </div>
            );
          })}

          {state.showEndMessage && (
            <div
              className="credits-end"
              style={{ fontSize: `${Math.max(12, h * 0.02)}px` }}
            >
              Press R to restart (if that was implemented)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
