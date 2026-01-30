import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { drawColonistAvatar } from '../../game/render/index';
import { playUiClickPrimary, playUiClickSecondary } from '../../game/audio/helpers/uiAudio';
import { getColonistProfileState, subscribeColonistProfile } from '../stores/colonistBioStore';
import { SkillsTab, GearTab, SocialTab, LogTab, HealthTab } from './ColonistProfileTabs';

interface TooltipProps {
  content: string | null;
  children: ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const targetRef = useRef<HTMLDivElement>(null);

  const handlePointerEnter = (e: React.PointerEvent) => {
    if (!content) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setIsVisible(true);
  };

  const handlePointerLeave = () => {
    setIsVisible(false);
  };

  return (
    <div 
      ref={targetRef}
      className="tooltip-wrapper"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      style={{ display: 'inline-block' }}
    >
      {children}
      {isVisible && content && (
        <div
          className="colonist-bio-tooltip"
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y - 8}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10000
          }}
        >
          <div className="colonist-bio-tooltip-content">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

function getTraitTooltip(trait: any): string {
  if (!trait) return '';
  
  const lines = [trait.description];
  
  if (trait.effects && trait.effects.length > 0) {
    lines.push('');
    lines.push('Effects:');
    trait.effects.forEach((effect: any) => {
      if (effect.description) {
        lines.push(`  • ${effect.description}`);
      }
    });
  }
  
  return lines.join('\n');
}

function getSkillTooltip(skill: string): string {
  const skillDescriptions: Record<string, string> = {
    'Carpentry': 'Ability to construct wooden structures and furniture. Higher skill increases work speed and quality.',
    'Masonry': 'Crafting with stone and brick. Skilled masons build faster and create more durable structures.',
    'Smithing': 'Forging metal weapons, tools, and armor. Quality improves with skill level.',
    'Tailoring': 'Sewing and leatherworking. Creates clothing and protective gear.',
    'Cooking': 'Preparing meals from raw ingredients. Higher skill reduces food waste and improves meal quality.',
    'Medicine': 'Treating injuries and illnesses. Experienced doctors heal faster and have better success rates.',
    'Herbalism': 'Knowledge of medicinal plants and natural remedies.',
    'Alchemy': 'Creating potions and compounds from various ingredients.',
    'Mechanics': 'Repairing and maintaining mechanical devices.',
    'Engineering': 'Designing and building complex structures and systems.',
    'Agriculture': 'Growing crops and managing farmland efficiently.',
    'Animal Husbandry': 'Raising and caring for livestock.',
    'Hunting': 'Tracking and killing wild animals for food and materials.',
    'Tracking': 'Following trails and finding hidden objects or creatures.',
    'Fishing': 'Catching fish from rivers, lakes, and oceans.',
    'Mining': 'Extracting ore and stone from the earth.',
    'Prospecting': 'Locating valuable mineral deposits.',
    'Gem Cutting': 'Shaping precious stones into valuable items.',
    'Jewelry Making': 'Crafting rings, necklaces, and other ornamental items.',
    'Glassblowing': 'Creating glass objects and art.',
    'Leatherworking': 'Processing and crafting leather goods.',
    'Pottery': 'Shaping clay into useful containers and decorative items.',
    'Weaving': 'Creating textiles from thread and fiber.',
    'Dyeing': 'Coloring fabrics and materials.',
    'Painting': 'Creating artistic works on canvas or surfaces.',
    'Sculpture': 'Carving and shaping three-dimensional art.',
    'Music': 'Playing instruments and composing songs.',
    'Storytelling': 'Entertaining and inspiring others with tales.',
    'Poetry': 'Writing verse and expressive literature.',
    'Calligraphy': 'Beautiful and artistic writing.',
    'Navigation': 'Finding direction and planning routes.',
    'Cartography': 'Creating accurate maps of territories.',
    'Astronomy': 'Understanding celestial bodies and their movements.',
    'Mathematics': 'Solving complex calculations and equations.',
    'Philosophy': 'Deep thinking about existence and meaning.',
    'Leadership': 'Inspiring and organizing others toward common goals.',
    'Tactics': 'Planning and executing combat strategies.',
    'Wilderness survival': 'Thriving in harsh natural environments.',
    'Gardening': 'Cultivating plants for food and beauty.',
    'Animal Care': 'Keeping animals healthy and happy.',
    'Taming wild beasts': 'Domesticating and training wild animals.',
    'Sleight of hand': 'Quick, dexterous manipulation of objects.',
    'Lockpicking': 'Opening locks without keys.',
    'Deep meditation': 'Achieving mental clarity and focus.',
    'Fortune-telling': 'Predicting future events through various means.',
    'First Aid': 'Providing immediate medical care for injuries.'
  };

  return skillDescriptions[skill] || `Knowledge and experience with ${skill.toLowerCase()}.`;
}

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
        {profile.personality?.map((trait) => {
          const traitData = colonist?.profile?.passiveTraits?.find((t: any) => t.name === trait);
          return (
            <Tooltip key={trait} content={traitData ? getTraitTooltip(traitData) : null}>
              <div className="colonist-bio-line colonist-bio-line--trait">• {trait}</div>
            </Tooltip>
          );
        })}
      </BioSection>
      <BioSection title="Family" hidden={!profile.family}>
        {renderFamily(profile.family)}
      </BioSection>
      <BioSection title="Skills" hidden={!profile.skills?.length}>
        <div className="colonist-bio-line colonist-bio-line--skills">
          • {profile.skills?.map((skill, idx) => (
            <Tooltip key={skill} content={getSkillTooltip(skill)}>
              <span className="colonist-bio-skill">
                {skill}{idx < (profile.skills?.length ?? 0) - 1 ? ', ' : ''}
              </span>
            </Tooltip>
          ))}
        </div>
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
