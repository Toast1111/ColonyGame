import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { drawColonistAvatar } from '../../game/render/index';
import { drawHealthTab, measureHealthTabHeight } from '../../game/ui/panels/healthTab';
import {
  drawSkillsTab,
  drawGearTab,
  drawSocialTab,
  drawLogTab,
  measureSkillsTabHeight,
  measureGearTabHeight,
  measureSocialTabHeight,
  measureLogTabHeight
} from '../../game/ui/panels/colonistProfile';
import { playUiClickPrimary, playUiClickSecondary } from '../../game/audio/helpers/uiAudio';
import { getColonistProfileState, subscribeColonistProfile } from '../stores/colonistBioStore';

export function ColonistProfilePanel() {
  const state = useSyncExternalStore(subscribeColonistProfile, getColonistProfileState, getColonistProfileState);

  const panelRect = state.rect;
  const contentRect = state.contentRect;
  if (!state.visible || !panelRect || !contentRect) {
    return null;
  }

  const uiScale = state.uiScale || 1;
  const tabRects = state.tabRects ?? [];
  const closeRect = state.closeRect ?? null;

  const handleClose = () => {
    const game = (window as any).game;
    if (game) {
      game.selColonist = null;
      game.follow = false;
    }
  };

  const handleTabClick = (tabId: string) => {
    const game = (window as any).game;
    if (game) {
      game.colonistProfileTab = tabId;
    }
  };

  return (
    <div className="colonist-profile-overlay" aria-hidden="true">
      <div className="colonist-profile-backdrop" onPointerDown={handleClose} />
      <div
        className="colonist-profile-panel"
        style={{
          left: `${panelRect.x}px`,
          top: `${panelRect.y}px`,
          width: `${panelRect.w}px`,
          height: `${panelRect.h}px`,
          ['--ui-scale' as any]: uiScale
        }}
      >
        <div className="colonist-profile-tabs">
          {tabRects.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`colonist-profile-tab${state.activeTab === tab.id ? ' active' : ''}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                handleTabClick(tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="colonist-profile-content">
          <div
            className={`colonist-bio-panel ${
              state.activeTab === 'health'
                ? 'colonist-bio-panel--health'
                : state.activeTab === 'skills' || state.activeTab === 'gear' || state.activeTab === 'social' || state.activeTab === 'log'
                  ? 'colonist-bio-panel--canvas'
                  : 'colonist-bio-panel--text'
            }`}
          >
            {state.activeTab === 'bio' && state.profile && (
              <BioTab
                avatarRect={state.avatarRect}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                profile={state.profile}
                colonist={state.colonist}
              />
            )}
            {state.activeTab === 'health' && (
              <HealthCanvas
                colonist={state.colonist}
                width={contentRect.w}
                height={contentRect.h}
                canvasHeight={measureHealthTabHeight(buildMeasureGame(uiScale, state.healthSubTab), state.colonist, 0, 0, contentRect.w, contentRect.h)}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                subTab={state.healthSubTab}
              />
            )}
            {state.activeTab === 'skills' && (
              <CanvasTab
                colonist={state.colonist}
                width={contentRect.w}
                height={contentRect.h}
                canvasHeight={measureSkillsTabHeight(buildMeasureGame(uiScale), state.colonist, 0, contentRect.h)}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                draw={(gameCtx, colonist, h) => drawSkillsTab(gameCtx, colonist, 0, 0, contentRect.w, h)}
              />
            )}
            {state.activeTab === 'gear' && (
              <CanvasTab
                colonist={state.colonist}
                width={contentRect.w}
                height={contentRect.h}
                canvasHeight={measureGearTabHeight(buildMeasureGame(uiScale), state.colonist, 0, contentRect.h)}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                draw={(gameCtx, colonist, h) => drawGearTab(gameCtx, colonist, 0, 0, contentRect.w, h)}
              />
            )}
            {state.activeTab === 'social' && (
              <CanvasTab
                colonist={state.colonist}
                width={contentRect.w}
                height={contentRect.h}
                canvasHeight={measureSocialTabHeight(buildMeasureGame(uiScale), state.colonist, 0, contentRect.h)}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                draw={(gameCtx, colonist, h) => drawSocialTab(gameCtx, colonist, 0, 0, contentRect.w, h)}
              />
            )}
            {state.activeTab === 'log' && (
              <CanvasTab
                colonist={state.colonist}
                width={contentRect.w}
                height={contentRect.h}
                canvasHeight={measureLogTabHeight(buildMeasureGame(uiScale), state.colonist, 0, contentRect.h)}
                uiScale={uiScale}
                dpr={state.dpr || window.devicePixelRatio || 1}
                draw={(gameCtx, colonist, h) => drawLogTab(gameCtx, colonist, 0, 0, contentRect.w, h)}
              />
            )}
          </div>
        </div>

        {closeRect && (
          <button
            type="button"
            className="colonist-profile-close"
            onPointerDown={(event) => {
              event.stopPropagation();
              handleClose();
            }}
          >
            ✕
          </button>
        )}

        <div className="colonist-profile-follow">
          {state.follow
            ? (state.isTouch ? 'Following (tap portrait to stop)' : 'Following (Esc to stop)')
            : (state.isTouch ? 'Tap portrait to follow' : 'Click to follow')}
        </div>
      </div>
    </div>
  );
}

function BioHeader({
  avatarRect,
  uiScale,
  dpr,
  profile,
  colonist
}: {
  avatarRect: { x: number; y: number; w: number; h: number } | null;
  uiScale: number;
  dpr: number;
  profile: NonNullable<ReturnType<typeof getColonistProfileState>['profile']>;
  colonist: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const avatarSize = avatarRect?.w || Math.round(64 * uiScale);

  useEffect(() => {
    if (!canvasRef.current || !colonist) return;
    const canvas = canvasRef.current;
    canvas.width = Math.round(avatarSize * dpr);
    canvas.height = Math.round(avatarSize * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, avatarSize, avatarSize);
    ctx.save();
    ctx.translate(avatarSize / 2, avatarSize / 2);
    // Force south-facing (front) direction and full body scale
    const avatarColonist = { ...colonist, direction: Math.PI / 2 }; // South facing
    ctx.scale(uiScale * 1.8, uiScale * 1.8); // Reduced scale to show full body
    drawColonistAvatar(ctx as any, 0, 0, avatarColonist, 18, true);
    ctx.restore();
  }, [avatarSize, dpr, uiScale, colonist]);

  const infoLines = useMemo(() => {
    const lines: Array<{ label: string; value: string; className?: string }> = [];
    lines.push({ label: 'Background', value: profile.background || 'Unknown', className: 'colonist-bio-info--muted' });
    lines.push({ label: 'Age', value: `${profile.age}` });
    if (profile.birthplace) {
      lines.push({ label: 'From', value: profile.birthplace, className: 'colonist-bio-info--accent' });
    }
    if (profile.favoriteFood) {
      lines.push({ label: 'Favorite Food', value: profile.favoriteFood, className: 'colonist-bio-info--gold' });
    }
    return lines;
  }, [profile]);

  const handleAvatarClick = () => {
    const game = (window as any).game;
    if (!game || !game.selColonist) return;
    game.follow = !game.follow;
    const colonistName = game.selColonist.profile?.name || 'colonist';
    game.msg?.(game.follow ? `Following ${colonistName}` : `Stopped following ${colonistName}`, 'info');
  };

  return (
    <div className="colonist-bio-header">
      <div
        className="colonist-bio-avatar"
        style={{ width: avatarSize, height: avatarSize }}
        onPointerDown={(event) => {
          event.stopPropagation();
          handleAvatarClick();
        }}
      >
        <canvas ref={canvasRef} style={{ width: avatarSize, height: avatarSize }} />
      </div>
      <div className="colonist-bio-summary">
        <div className="colonist-bio-name">{profile.name}</div>
        {infoLines.map((line) => (
          <div key={line.label} className={`colonist-bio-info ${line.className ?? ''}`.trim()}>
            <span className="colonist-bio-info-label">{line.label}:</span>
            <span className="colonist-bio-info-value">{line.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BioTab({
  avatarRect,
  uiScale,
  dpr,
  profile,
  colonist
}: {
  avatarRect: { x: number; y: number; w: number; h: number } | null;
  uiScale: number;
  dpr: number;
  profile: NonNullable<ReturnType<typeof getColonistProfileState>['profile']>;
  colonist: any;
}) {
  return (
    <>
      <BioHeader
        avatarRect={avatarRect}
        uiScale={uiScale}
        dpr={dpr}
        profile={profile}
        colonist={colonist}
      />
      <BioSection title="Personality Traits" hidden={!profile.personality?.length}>
        {profile.personality?.map((trait) => (
          <div key={trait} className="colonist-bio-line colonist-bio-line--trait">• {trait}</div>
        ))}
      </BioSection>
      <BioSection title="Family" hidden={!profile.family}>
        {renderFamily(profile.family)}
      </BioSection>
      <BioSection title="Skills" hidden={!profile.skills?.length}>
        <div className="colonist-bio-line colonist-bio-line--skills">• {profile.skills?.join(', ')}</div>
      </BioSection>
      <BioSection title="Backstory" hidden={!profile.backstory}>
        <div className="colonist-bio-backstory">{profile.backstory}</div>
      </BioSection>
    </>
  );
}

function BioSection({
  title,
  hidden,
  children
}: {
  title: string;
  hidden?: boolean;
  children: ReactNode;
}) {
  if (hidden) return null;
  return (
    <div className="colonist-bio-section">
      <div className="colonist-bio-section-title">{title}</div>
      <div className="colonist-bio-section-body">{children}</div>
    </div>
  );
}

function renderFamily(family?: {
  parents: string[];
  siblings: string[];
  spouse?: string;
  children: string[];
}) {
  if (!family) return null;
  const lines: Array<{ label: string; value?: string }> = [];
  if (family.parents?.length) lines.push({ label: 'Parents', value: family.parents.join(', ') });
  if (family.siblings?.length) lines.push({ label: 'Siblings', value: family.siblings.join(', ') });
  if (family.spouse) lines.push({ label: 'Spouse', value: family.spouse });
  if (family.children?.length) lines.push({ label: 'Children', value: family.children.join(', ') });

  return lines.map((line) => (
    <div key={line.label} className="colonist-bio-line colonist-bio-line--family">
      {line.label}: {line.value}
    </div>
  ));
}

function HealthCanvas({
  colonist,
  width,
  height,
  canvasHeight,
  uiScale,
  dpr,
  subTab
}: {
  colonist: any;
  width: number;
  height: number;
  canvasHeight: number;
  uiScale: number;
  dpr: number;
  subTab: 'overview' | 'operations' | 'injuries';
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rectsRef = useRef<{
    subTabs: Array<{ tab: string; x: number; y: number; w: number; h: number }>;
    toggles: Array<{ type: string; x: number; y: number; w: number; h: number }>;
    ops: Array<any>;
  }>({ subTabs: [], toggles: [], ops: [] });

  useEffect(() => {
    if (!canvasRef.current || !colonist) return;
    const canvas = canvasRef.current;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, canvasHeight);

    const proxyGame: any = {
      ctx,
      uiScale,
      DPR: dpr,
      colonistHealthSubTab: subTab || 'overview',
      colonistHealthSubTabRects: [],
      colonistHealthToggles: [],
      colonistHealthOperationButtons: [],
      scale: (value: number) => Math.round(value * uiScale),
      getScaledFont: (base: number, weight = '500', family = 'system-ui,Segoe UI,Roboto') => {
        return `${weight} ${Math.round(base * uiScale)}px ${family}`;
      }
    };

    drawHealthTab(proxyGame, colonist, 0, 0, width, canvasHeight);
    rectsRef.current = {
      subTabs: proxyGame.colonistHealthSubTabRects || [],
      toggles: proxyGame.colonistHealthToggles || [],
      ops: proxyGame.colonistHealthOperationButtons || []
    };
  }, [colonist, width, height, uiScale, dpr, subTab]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const game = (window as any).game;

    const { subTabs, toggles, ops } = rectsRef.current;
    for (const tab of subTabs) {
      if (x >= tab.x && x <= tab.x + tab.w && y >= tab.y && y <= tab.y + tab.h) {
        if (game) game.colonistHealthSubTab = tab.tab;
        return;
      }
    }

    for (const toggle of toggles) {
      if (x >= toggle.x && x <= toggle.x + toggle.w && y >= toggle.y && y <= toggle.y + toggle.h) {
        if (toggle.type === 'selfTend' && game?.selColonist) {
          game.selColonist.selfTend = !game.selColonist.selfTend;
          game.msg?.(`Self-tend ${game.selColonist.selfTend ? 'enabled' : 'disabled'}`, 'info');
        }
        return;
      }
    }

    for (const button of ops) {
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        if (button.type === 'add' && game?.selColonist && button.operation) {
          game.queueOperation?.(game.selColonist, button.operation);
          playUiClickPrimary(game);
        } else if (button.type === 'cancel' && game?.selColonist && button.operationId) {
          game.cancelOperation?.(game.selColonist, button.operationId);
          playUiClickSecondary(game);
        }
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="colonist-health-canvas"
      style={{ width: `${width}px`, height: `${canvasHeight}px` }}
      onPointerDown={handlePointerDown}
    />
  );
}

function CanvasTab({
  colonist,
  width,
  height,
  canvasHeight,
  uiScale,
  dpr,
  draw
}: {
  colonist: any;
  width: number;
  height: number;
  canvasHeight: number;
  uiScale: number;
  dpr: number;
  draw: (gameCtx: any, colonist: any, height: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !colonist) return;
    const canvas = canvasRef.current;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, canvasHeight);

    const game = (window as any).game;
    const proxyGame: any = {
      ctx,
      uiScale,
      DPR: 1,
      mouse: { x: mouseRef.current.x, y: mouseRef.current.y },
      t: game?.t,
      day: game?.day,
      tDay: game?.tDay,
      colonists: game?.colonists ?? [],
      scale: (value: number) => Math.round(value * uiScale),
      getScaledFont: (base: number, weight = '500', family = 'system-ui,Segoe UI,Roboto') => {
        return `${weight} ${Math.round(base * uiScale)}px ${family}`;
      }
    };

    draw(proxyGame, colonist, canvasHeight);
  }, [colonist, width, height, canvasHeight, uiScale, dpr, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="colonist-health-canvas"
      style={{ width: `${width}px`, height: `${canvasHeight}px` }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      }}
    />
  );
}

function buildMeasureGame(uiScale: number, healthSubTab?: 'overview' | 'operations' | 'injuries') {
  return {
    uiScale,
    colonists: (window as any).game?.colonists ?? [],
    scale: (value: number) => Math.round(value * uiScale),
    getScaledFont: (base: number, weight = '500', family = 'system-ui,Segoe UI,Roboto') => {
      return `${weight} ${Math.round(base * uiScale)}px ${family}`;
    },
    colonistHealthSubTab: healthSubTab ?? (window as any).game?.colonistHealthSubTab ?? 'overview'
  };
}