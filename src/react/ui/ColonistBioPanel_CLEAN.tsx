import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { drawColonistAvatar } from '../../game/render/index';
import { playUiClickPrimary, playUiClickSecondary } from '../../game/audio/helpers/uiAudio';
import { getColonistProfileState, subscribeColonistProfile } from '../stores/colonistBioStore';
import { SkillsTab, GearTab, SocialTab, LogTab, HealthTab } from './ColonistProfileTabs';

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
              <HealthTab colonist={state.colonist} uiScale={uiScale} />
            )}
            {state.activeTab === 'skills' && state.skills && (
              <SkillsTab skills={state.skills} uiScale={uiScale} />
            )}
            {state.activeTab === 'gear' && state.gear && (
              <GearTab gear={state.gear} uiScale={uiScale} />
            )}
            {state.activeTab === 'social' && state.social && (
              <SocialTab relationships={state.social} uiScale={uiScale} />
            )}
            {state.activeTab === 'log' && state.log && (
              <LogTab entries={state.log} uiScale={uiScale} />
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
