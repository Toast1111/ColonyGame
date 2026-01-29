import { setColonistProfileState } from "../../../react";
import { drawColonistAvatar } from "../../render";

export function drawColonistProfile(game: any, c: any) {
  const cw = game.canvas.width; 
  const ch = game.canvas.height; 

  const isTouchUI = !!game.touchUIEnabled;

  // Responsive sizing - scale down for smaller screens
  const baseW = isTouchUI ? 420 : 550;
  const baseH = isTouchUI ? 600 : 700;
  const minW = isTouchUI ? 260 : 320;
  const minH = isTouchUI ? 400 : 480;

  const scaleW = isTouchUI
    ? Math.max(0.6, Math.min(0.95, cw / 720))
    : Math.max(0.5, Math.min(0.85, cw / 800));
  const scaleH = isTouchUI
    ? Math.max(0.6, Math.min(0.9, ch / 640))
    : Math.max(0.5, Math.min(0.85, ch / 600));
  const scale = Math.min(scaleW, scaleH); // Use smaller scale to fit both dimensions

  const PAD = game.scale(8);
  const maxW = cw * (isTouchUI ? 0.55 : 0.9);
  const maxH = ch * (isTouchUI ? 0.9 : 0.95);
  const W = Math.max(minW, Math.min(game.scale(baseW * scale), maxW));
  const H = Math.max(minH, Math.min(game.scale(baseH * scale), maxH));
  const X = PAD; // Always anchor left (like mobile) to free the center view
  const headerEl = typeof document !== 'undefined' ? document.querySelector('header') as HTMLElement | null : null;
  const resourceEl = typeof document !== 'undefined' ? document.querySelector('.resource-bar') as HTMLElement | null : null;
  const headerH = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
  const resourceH = resourceEl ? Math.ceil(resourceEl.getBoundingClientRect().height) : 0;
  const uiTopOffset = (headerH + resourceH) * (game.DPR || 1);
  const Y = Math.max(PAD + uiTopOffset, isTouchUI ? PAD + game.scale(28) : game.scale(54));
  const finalY = Math.max(PAD, Math.min(Y, ch - H - PAD));

  const tabHeight = game.scale(32);
  const tabY = finalY + game.scale(12);
  const tabs = [
    { id: 'bio', label: 'Bio', icon: '👤' },
    { id: 'health', label: 'Health', icon: '❤️' },
    { id: 'gear', label: 'Gear', icon: '🎒' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'skills', label: 'Skills', icon: '🛠️' },
    { id: 'log', label: 'Log', icon: '📜' }
  ];

  const tabWidth = (W - game.scale(32)) / tabs.length;
  const tabRects = tabs.map((tab: any, i: number) => {
    const tabX = X + game.scale(16) + i * tabWidth;
    return { ...tab, x: tabX, y: tabY, w: tabWidth, h: tabHeight };
  });

  const contentY = tabY + tabHeight + game.scale(8);
  const contentH = H - (contentY - finalY) - game.scale(16);
  const closeSize = game.scale(26);
  const closePad = game.scale(8);
  const closeX = X + W - closePad - closeSize;
  const closeY = finalY + H - closePad - closeSize;

  game.colonistPanelRect = { x: X, y: finalY, w: W, h: H };
  game.colonistPanelCloseRect = { x: closeX, y: closeY, w: closeSize, h: closeSize };
  game.colonistTabRects = [];

  syncColonistProfilePanel(game, c, game.colonistProfileTab, {
    panel: { x: X, y: finalY, w: W, h: H },
    content: { x: X + game.scale(16), y: contentY, w: W - game.scale(32), h: contentH },
    close: { x: closeX, y: closeY, w: closeSize, h: closeSize },
    tabs: tabRects
  });
}

function syncColonistProfilePanel(
  game: any,
  colonist: any,
  activeTab: 'bio' | 'health' | 'gear' | 'social' | 'skills' | 'log',
  layout: {
    panel: { x: number; y: number; w: number; h: number };
    content: { x: number; y: number; w: number; h: number };
    close: { x: number; y: number; w: number; h: number };
    tabs: Array<{ id: string; label: string; icon: string; x: number; y: number; w: number; h: number }>;
  }
) {
  const profile = colonist?.profile;
  const detailedInfo = profile?.detailedInfo;
  if (!game.colonistHealthSubTab) {
    game.colonistHealthSubTab = 'overview';
  }
  const avatarSize = game.scale(64);
  const avatarX = layout.content.x + game.scale(8);
  const avatarY = layout.content.y + game.scale(8);

  if (activeTab === 'bio') {
    game.colonistAvatarRect = { x: avatarX, y: avatarY, w: avatarSize, h: avatarSize };
  } else {
    game.colonistAvatarRect = null;
  }

  const cssScale = 1 / (game.DPR || 1);
  const panelRect = {
    x: layout.panel.x * cssScale,
    y: layout.panel.y * cssScale,
    w: layout.panel.w * cssScale,
    h: layout.panel.h * cssScale
  };
  const contentRect = {
    x: layout.content.x * cssScale,
    y: layout.content.y * cssScale,
    w: layout.content.w * cssScale,
    h: layout.content.h * cssScale
  };
  const avatarRect = {
    x: avatarX * cssScale,
    y: avatarY * cssScale,
    w: avatarSize * cssScale,
    h: avatarSize * cssScale
  };
  const closeRect = {
    x: layout.close.x * cssScale,
    y: layout.close.y * cssScale,
    w: layout.close.w * cssScale,
    h: layout.close.h * cssScale
  };
  const tabRects = layout.tabs.map((tab) => ({
    ...tab,
    x: tab.x * cssScale,
    y: tab.y * cssScale,
    w: tab.w * cssScale,
    h: tab.h * cssScale
  }));

  const baseProfile = profile
    ? {
        name: profile.name || 'Colonist',
        background: profile.background || 'Unknown',
        age: profile.age ?? 25,
        birthplace: detailedInfo?.birthplace,
        favoriteFood: profile.favoriteFood,
        personality: Array.isArray(profile.personality) ? profile.personality : [],
        family: detailedInfo?.family
          ? {
              parents: detailedInfo.family.parents || [],
              siblings: detailedInfo.family.siblings || [],
              spouse: detailedInfo.family.spouse,
              children: detailedInfo.family.children || []
            }
          : undefined,
        skills: Array.isArray(detailedInfo?.skills) ? detailedInfo.skills : undefined,
        backstory: profile.backstory
      }
    : {
        name: 'Colonist',
        background: 'Unknown',
        age: 25,
        personality: []
      };

  const skills = activeTab === 'skills' && colonist?.skills
    ? (Object.values(colonist.skills.byName) as any[])
        .slice()
        .sort((a, b) => b.level - a.level)
        .map((s) => {
          const needed = 100 + Math.pow(s.level + 1, 1.6) * 40;
          const pct = Math.max(0, Math.min(1, s.xp / needed));
          const now = game.t || 0;
          const recentWindow = 3;
          let recent = 0;
          if (s.xpDeltas && s.xpDeltas.length) {
            for (let i = s.xpDeltas.length - 1; i >= 0; i--) {
              const d = s.xpDeltas[i];
              if (d.t >= now - recentWindow) recent += d.amount;
              else break;
            }
          }
          return {
            name: s.name,
            level: s.level,
            passion: s.passion,
            xp: s.xp,
            needed,
            pct,
            recentGain: recent,
            workSpeed: (0.6 + Math.pow(s.level, 0.9) * 0.06) * 100
          };
        })
    : undefined;

  const gear = activeTab === 'gear'
    ? (() => {
        const inventory = colonist?.inventory;
        if (!inventory) {
          return { equipment: [], items: [], carrying: [], hasInventory: false };
        }
        const equipmentSlots = ['helmet', 'armor', 'weapon', 'tool', 'shield', 'accessory'];
        const equipment = equipmentSlots.map((slot) => {
          const item = inventory.equipment?.[slot as any];
          return {
            slot: slot.charAt(0).toUpperCase() + slot.slice(1),
            name: item?.name,
            quality: item?.quality,
            durability: item?.durability
          };
        });
        const items = (inventory.items || []).map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          quality: item.quality,
          durability: item.durability
        }));

        const carrying: { name: string; qty: number }[] = [];
        const payload = (colonist as any).carryingItem;
        if (payload && payload.qty > 0) {
          const pretty = (payload.type || 'Item').toString();
          const name = pretty.charAt(0).toUpperCase() + pretty.slice(1);
          carrying.push({ name, qty: payload.qty });
        }
        if (colonist.carryingWheat && colonist.carryingWheat > 0) carrying.push({ name: 'Wheat', qty: colonist.carryingWheat });
        if (colonist.carryingBread && colonist.carryingBread > 0) carrying.push({ name: 'Bread', qty: colonist.carryingBread });

        return { equipment, items, carrying, hasInventory: true };
      })()
    : undefined;

  const social = activeTab === 'social'
    ? (() => {
        const otherColonists = (game.colonists as any[]).filter((col) => col !== colonist && col.alive);
        if (otherColonists.length === 0) return [];
        return otherColonists.slice(0, 3).map((other) => {
          let relationship = 'Neutral';
          if (profile?.detailedInfo?.relationships) {
            const rel = profile.detailedInfo.relationships.find((r: any) => r.name === other.profile?.name);
            if (rel?.type) relationship = rel.type;
          }
          const relationshipColor = relationship === 'Friend' || relationship === 'Good friend'
            ? '#22c55e'
            : relationship === 'Rival'
              ? '#ef4444'
              : '#94a3b8';
          return {
            name: other.profile?.name || 'Colonist',
            relationship,
            color: relationshipColor
          };
        });
      })()
    : undefined;

  const log = activeTab === 'log'
    ? (() => {
        const entries = (colonist.activityLog || []) as any[];
        const rowH = game.scale(16);
        const textStart = layout.content.y + game.scale(8) + game.scale(24);
        const maxVisible = Math.max(0, Math.floor((layout.content.y + layout.content.h - textStart - game.scale(8)) / rowH));
        const visibleEntries = maxVisible > 0 ? entries.slice(Math.max(0, entries.length - maxVisible)) : [];
        return visibleEntries.map((entry) => ({
          stamp: formatLogTime(game, entry),
          label: entry.label || '—',
          type: entry.type
        }));
      })()
    : undefined;

  setColonistProfileState({
    visible: true,
    activeTab,
    healthSubTab: game.colonistHealthSubTab || 'overview',
    rect: panelRect,
    contentRect,
    avatarRect,
    closeRect,
    tabRects,
    uiScale: game.uiScale || 1,
    dpr: game.DPR || 1,
    isTouch: !!game.isTouch,
    follow: !!game.follow,
    colonist,
    profile: baseProfile,
    skills,
    gear,
    social,
    log
  });
}

function drawBioTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  let textY = y + game.scale(8);
  const avatarSize = game.scale(64);
  const ax = x + game.scale(8);
  const ay = textY;
  
  // Store avatar click area (only when bio tab is active)
  if (game.colonistProfileTab === 'bio') {
    game.colonistAvatarRect = { x: ax, y: ay, w: avatarSize, h: avatarSize };
  }
  
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ax, ay, avatarSize, avatarSize);
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(ax + .5, ay + .5, avatarSize - 1, avatarSize - 1);
  ctx.save();
  ctx.translate(ax + avatarSize/2, ay + avatarSize/2);
  ctx.scale(game.uiScale * 2, game.uiScale * 2);
  drawColonistAvatar(ctx as any, 0, 0, c, 16, true);
  ctx.restore();
  const profile = c.profile;
  const infoX = ax + avatarSize + game.scale(16);
  let infoY = ay + game.scale(8);
  ctx.fillStyle = '#dbeafe';
  ctx.font = game.getScaledFont(18, '700');
  ctx.textAlign = 'left';
  if (profile) {
    ctx.fillText(profile.name, infoX, infoY); infoY += game.scale(22);
    ctx.font = game.getScaledFont(13, '400'); ctx.fillStyle = '#94a3b8';
    ctx.fillText(profile.background, infoX, infoY); infoY += game.scale(16);
    ctx.fillStyle = '#60a5fa';
    const age = (profile as any).age || Math.floor(Math.random() * 30) + 20;
    ctx.fillText(`Age: ${age}`, infoX, infoY); infoY += game.scale(14);
    if ((profile as any).detailedInfo?.birthplace) {
      ctx.fillStyle = '#a78bfa';
      ctx.fillText(`From: ${(profile as any).detailedInfo.birthplace}`, infoX, infoY);
      infoY += game.scale(14);
    }
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Favorite Food: ${profile.favoriteFood}`, infoX, infoY);
  } else {
    ctx.fillText('Unnamed Colonist', infoX, infoY); infoY += game.scale(22);
    ctx.font = game.getScaledFont(13, '400'); ctx.fillStyle = '#94a3b8';
    ctx.fillText('No background available', infoX, infoY);
  }
  textY = ay + avatarSize + game.scale(20);
  const detailedInfo = (profile as any)?.detailedInfo;
  if (profile && profile.personality.length > 0) {
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600');
    ctx.fillText('Personality Traits', x, textY); textY += game.scale(18);
    for (const trait of profile.personality) {
      ctx.fillStyle = '#60a5fa'; ctx.font = game.getScaledFont(12, '400');
      ctx.fillText(`• ${trait}`, x + game.scale(8), textY); textY += game.scale(16);
    }
    textY += game.scale(8);
  }
  if (detailedInfo && detailedInfo.family) {
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600');
    ctx.fillText('Family', x, textY); textY += game.scale(18);
    ctx.fillStyle = '#10b981'; ctx.font = game.getScaledFont(11, '400');
    if (detailedInfo.family.parents.length > 0) { ctx.fillText(`Parents: ${detailedInfo.family.parents.join(', ')}`, x + game.scale(8), textY); textY += game.scale(14); }
    if (detailedInfo.family.siblings.length > 0) { ctx.fillText(`Siblings: ${detailedInfo.family.siblings.join(', ')}`, x + game.scale(8), textY); textY += game.scale(14); }
    if (detailedInfo.family.spouse) { ctx.fillText(`Spouse: ${detailedInfo.family.spouse}`, x + game.scale(8), textY); textY += game.scale(14); }
    if (detailedInfo.family.children.length > 0) { ctx.fillText(`Children: ${detailedInfo.family.children.join(', ')}`, x + game.scale(8), textY); textY += game.scale(14); }
    textY += game.scale(8);
  }
  if (detailedInfo && detailedInfo.skills && detailedInfo.skills.length > 0) {
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600');
    ctx.fillText('Skills', x, textY); textY += game.scale(18);
    ctx.fillStyle = '#f59e0b'; ctx.font = game.getScaledFont(11, '400');
    ctx.fillText(`• ${detailedInfo.skills.join(', ')}`, x + game.scale(8), textY); textY += game.scale(16);
  }
  if (profile && profile.backstory) {
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600');
    ctx.fillText('Backstory', x, textY); textY += game.scale(18);
    ctx.fillStyle = '#94a3b8'; ctx.font = game.getScaledFont(11, '400');
    const words = profile.backstory.split(' ');
    const maxWidth = w - game.scale(16);
    let line = '';
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x + game.scale(8), textY);
        textY += game.scale(14);
        line = word + ' ';
        if (textY > y + h - game.scale(20)) break;
      } else { line = testLine; }
    }
    if (line.trim() && textY <= y + h - game.scale(20)) ctx.fillText(line.trim(), x + game.scale(8), textY);
  }
}

// Old drawHealthTab function removed - now using healthTab.ts module

export function drawSkillsTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  ctx.save();
  let rowY = y + game.scale(4);
  ctx.fillStyle = '#f1f5f9';
  ctx.font = game.getScaledFont(16, '600');
  ctx.textAlign = 'left';
  ctx.fillText('Skills', x, rowY); rowY += game.scale(22);

  if (!c.skills) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = game.getScaledFont(12, '400');
    ctx.fillText('No skills data', x, rowY);
    ctx.restore();
    return;
  }

  const skills = Object.values(c.skills.byName) as any[];
  skills.sort((a,b)=> b.level - a.level);
  const barHeight = game.scale(14);
  const barWidth = w - game.scale(180);
  ctx.font = game.getScaledFont(11, '400');
  const hoverRects: any[] = [];
  for (const s of skills) {
    if (rowY + barHeight > y + h - game.scale(8)) break;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(s.name, x, rowY + barHeight * 0.8);
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(String(s.level).padStart(2,' '), x + game.scale(110), rowY + barHeight * 0.8);
    let passionColor = '#475569';
    let passionGlyph = '';
    if (s.passion === 'interested') { passionColor = '#fbbf24'; passionGlyph = '★'; }
    else if (s.passion === 'burning') { passionColor = '#f97316'; passionGlyph = '★★'; }
    if (passionGlyph) { ctx.fillStyle = passionColor; ctx.fillText(passionGlyph, x + game.scale(140), rowY + barHeight * 0.8); }
    const bx = x + game.scale(170);
    const by = rowY + game.scale(2);
    ctx.fillStyle = '#1e293b'; ctx.fillRect(bx, by, barWidth, barHeight - game.scale(4));
    ctx.fillStyle = '#0f172a'; ctx.fillRect(bx+1, by+1, barWidth-2, barHeight - game.scale(6));
    const needed = 100 + Math.pow(s.level+1, 1.6) * 40;
    const pct = Math.max(0, Math.min(1, s.xp / needed));
    const fillW = Math.round((barWidth-4) * pct);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(bx+2, by+2, fillW, barHeight - game.scale(8));
    ctx.fillStyle = '#cbd5e1'; ctx.font = game.getScaledFont(9, '400'); ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(pct*100)}%`, bx + barWidth/2, by + (barHeight - game.scale(8))/2 + game.scale(2));
    ctx.textAlign = 'left';
    hoverRects.push({ x: bx, y: by, w: barWidth, h: barHeight - game.scale(4), skill: s, needed });
    rowY += barHeight + game.scale(6);
  }

  // Tooltip when hovering over a skill progress bar
  const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
  for (const hr of hoverRects) {
    if (mx >= hr.x && mx <= hr.x + hr.w && my >= hr.y && my <= hr.y + hr.h) {
      const s = hr.skill; const needed = hr.needed; const remaining = Math.max(0, Math.round(needed - s.xp));
      // Compute recent XP gained in the last few seconds for live feedback
      const now = (game.t || 0);
      const recentWindow = 3; // seconds
      let recent = 0;
      if (s.xpDeltas && s.xpDeltas.length) {
        for (let i = s.xpDeltas.length - 1; i >= 0; i--) {
          const d = s.xpDeltas[i];
          if (d.t >= now - recentWindow) recent += d.amount;
          else break;
        }
      }
      const mult = s.passion === 'burning' ? 'x200%' : s.passion === 'interested' ? 'x150%' : 'x100%';
      const lines = [
        `${s.name} (Level ${s.level})`,
        `XP: ${Math.round(s.xp)}/${Math.round(needed)}`,
        `To next: ${remaining}`,
        ...(recent > 0 ? [`Recent gain: +${recent.toFixed(1)} XP (last ${recentWindow}s)`] : []),
        `Passion: ${s.passion || 'none'} (${mult})`,
        `Work Speed: ${((0.6 + Math.pow(s.level, 0.9) * 0.06) * 100).toFixed(0)}%`
      ];
      const pad = game.scale(6); ctx.font = game.getScaledFont(11,'400');
      let wMax = 0; for (const ln of lines) { const m = ctx.measureText(ln).width; if (m>wMax) wMax = m; }
      const boxW = wMax + pad*2; const boxH = lines.length * game.scale(14) + pad*2;
      let tx = hr.x + game.scale(10); let ty = hr.y - boxH - game.scale(4);
      if (ty < y) ty = hr.y + game.scale(18); if (tx + boxW > x + w) tx = x + w - boxW;
      ctx.fillStyle = 'rgba(15,23,42,0.92)'; ctx.fillRect(tx, ty, boxW, boxH);
      ctx.strokeStyle = '#334155'; ctx.strokeRect(tx+0.5, ty+0.5, boxW-1, boxH-1);
      let ly = ty + pad;
      for (const ln of lines) { ctx.fillStyle = '#e2e8f0'; ctx.fillText(ln, tx + pad, ly + game.scale(11)); ly += game.scale(14); }
      break;
    }
  }
  ctx.restore();
}

export function drawGearTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  let textY = y + game.scale(8);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(16, '600'); ctx.textAlign = 'left';
  ctx.fillText('Equipment & Inventory', x, textY); textY += game.scale(24);
  if (!c.inventory) { ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText('No inventory data available', x, textY); return; }
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Equipment', x, textY); textY += game.scale(18);
  const equipmentSlots = ['helmet', 'armor', 'weapon', 'tool', 'shield', 'accessory'];
  for (const slot of equipmentSlots) {
    const item = c.inventory.equipment[slot as any];
    ctx.fillStyle = '#94a3b8'; ctx.font = game.getScaledFont(12, '500');
    const slotName = slot.charAt(0).toUpperCase() + slot.slice(1);
    ctx.fillText(`${slotName}:`, x, textY);
    if (item) {
      ctx.fillStyle = getItemQualityColor(game, item.quality || 'normal');
      ctx.font = game.getScaledFont(12, '400');
      ctx.fillText(item.name, x + game.scale(80), textY);
      ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400');
      ctx.fillText(`(${item.quality || 'normal'})`, x + game.scale(180), textY);
    } else {
      ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(12, '400');
      ctx.fillText('None', x + game.scale(80), textY);
    }
    textY += game.scale(16);
  }
  textY += game.scale(12);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Inventory Items', x, textY); textY += game.scale(18);
  if (c.inventory.items.length === 0) {
    ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText('No items in inventory', x + game.scale(8), textY);
  } else {
    for (const item of c.inventory.items) {
      ctx.fillStyle = getItemQualityColor(game, item.quality || 'normal'); ctx.font = game.getScaledFont(12, '400');
      const displayText = `${item.name} (${item.quantity})`;
      ctx.fillText(displayText, x + game.scale(8), textY);
      ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400');
      ctx.fillText(`${item.quality || 'normal'}`, x + game.scale(150), textY);
      if (item.durability !== undefined) ctx.fillText(`${Math.round(item.durability)}%`, x + game.scale(200), textY);
      textY += game.scale(16);
      if (textY > y + h - game.scale(20)) { ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400'); ctx.fillText('...more items', x + game.scale(8), textY); break; }
    }
  }
  // Show transient hauling payloads so players can see what the pawn is carrying right now
  const carriedList: { name: string; qty: number }[] = [];
  const payload = (c as any).carryingItem;
  if (payload && payload.qty > 0) {
    const pretty = (payload.type || 'Item').toString();
    const name = pretty.charAt(0).toUpperCase() + pretty.slice(1);
    carriedList.push({ name, qty: payload.qty });
  }
  if (c.carryingWheat && c.carryingWheat > 0) carriedList.push({ name: 'Wheat', qty: c.carryingWheat });
  if (c.carryingBread && c.carryingBread > 0) carriedList.push({ name: 'Bread', qty: c.carryingBread });
  if (carriedList.length > 0) {
    textY += game.scale(12);
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Currently Carrying', x, textY); textY += game.scale(18);
    for (const it of carriedList) {
      ctx.fillStyle = '#22c55e'; ctx.font = game.getScaledFont(12, '400');
      ctx.fillText(`${it.name} (${it.qty})`, x + game.scale(8), textY);
      textY += game.scale(16);
      if (textY > y + h - game.scale(20)) break;
    }
  }
}

export function drawSocialTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D; let textY = y + game.scale(8);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(16, '600'); ctx.textAlign = 'left'; ctx.fillText('Social Relationships', x, textY); textY += game.scale(24);
  ctx.fillStyle = '#94a3b8'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText('Social skill: Novice', x, textY); textY += game.scale(16);
  textY += game.scale(16);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Colony Relationships', x, textY); textY += game.scale(18);
  const otherColonists = (game.colonists as any[]).filter(col => col !== c && col.alive);
  if (otherColonists.length > 0) {
    for (let i = 0; i < Math.min(otherColonists.length, 3); i++) {
      const other = otherColonists[i];
      const relationship = ['Neutral', 'Friend', 'Good friend', 'Rival'][Math.floor(Math.random() * 4)];
      const relationshipColor = relationship === 'Friend' || relationship === 'Good friend' ? '#22c55e' : relationship === 'Rival' ? '#ef4444' : '#94a3b8';
      ctx.fillStyle = '#dbeafe'; ctx.font = game.getScaledFont(11, '500'); ctx.fillText(other.profile?.name || 'Colonist', x + game.scale(8), textY);
      ctx.fillStyle = relationshipColor; ctx.font = game.getScaledFont(11, '400'); ctx.fillText(relationship, x + game.scale(120), textY);
      textY += game.scale(16);
    }
  } else { ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(11, '400'); ctx.fillText('No other colonists in colony', x + game.scale(8), textY); }
}

// Stats tab removed

type ActivityLogEntry = {
  label: string;
  type?: string;
  timeStr?: string; // preformatted timestamp
  day?: number;
  tDay?: number; // 0-1 time-of-day fraction
  at?: number; // absolute timestamp in seconds (fallback)
};

export function drawLogTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  let textY = y + game.scale(8);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = game.getScaledFont(16, '600');
  ctx.textAlign = 'left';
  ctx.fillText('Activity Log', x, textY);
  textY += game.scale(24);

  const entries: ActivityLogEntry[] = c.activityLog || [];

  // Limit stored entries to what fits on screen to avoid unbounded growth.
  const rowH = game.scale(16);
  const maxVisible = Math.max(0, Math.floor((h - (textY - y) - game.scale(8)) / rowH));
  if (entries.length > maxVisible) {
    entries.splice(0, entries.length - maxVisible);
  }

  if (entries.length === 0) {
    ctx.fillStyle = '#6b7280';
    ctx.font = game.getScaledFont(12, '400');
    ctx.fillText('No activity recorded yet.', x, textY);
    return;
  }

  for (const entry of entries) {
    const stamp = formatLogTime(game, entry);
    const color = getLogColor(entry.type);

    ctx.fillStyle = '#6b7280';
    ctx.font = game.getScaledFont(10, '400');
    ctx.fillText(stamp, x, textY);

    ctx.fillStyle = color;
    ctx.font = game.getScaledFont(11, '400');
    ctx.fillText(entry.label || '—', x + game.scale(108), textY);

    textY += rowH;
    if (textY > y + h - game.scale(4)) break;
  }
}

function formatLogTime(game: any, entry: ActivityLogEntry): string {
  if (entry.timeStr) return entry.timeStr;
  const day = entry.day ?? game.day;
  const tDay = entry.tDay ?? game.tDay;
  const hour = Math.floor((tDay || 0) * 24);
  const minute = Math.floor(((tDay || 0) * 24 - hour) * 60);
  return `Day ${day} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function getLogColor(type?: string): string {
  switch (type) {
    case 'work': return '#60a5fa';
    case 'need': return '#22c55e';
    case 'rest': return '#a78bfa';
    case 'combat': return '#f87171';
    case 'social': return '#fbbf24';
    default: return '#94a3b8';
  }
}

function getItemQualityColor(game: any, quality: string): string {
  switch (quality.toLowerCase()) {
    case 'legendary': return '#a855f7';
    case 'masterwork': return '#f59e0b';
    case 'excellent': return '#10b981';
    case 'good': return '#3b82f6';
    case 'normal': return '#6b7280';
    case 'poor': return '#ef4444';
    case 'awful': return '#991b1b';
    default: return '#6b7280';
  }
}

export function measureSkillsTabHeight(game: any, c: any, y: number, h: number): number {
  let rowY = y + game.scale(4);
  rowY += game.scale(22);
  if (!c.skills) {
    return Math.max(h, rowY + game.scale(16));
  }
  const skills = Object.values(c.skills.byName) as any[];
  const barHeight = game.scale(14);
  const rowH = barHeight + game.scale(6);
  rowY += skills.length * rowH;
  return Math.max(h, rowY + game.scale(8));
}

export function measureGearTabHeight(game: any, c: any, y: number, h: number): number {
  let textY = y + game.scale(8);
  textY += game.scale(24);
  if (!c.inventory) {
    return Math.max(h, textY + game.scale(16));
  }
  textY += game.scale(18);
  const equipmentSlots = 6;
  textY += equipmentSlots * game.scale(16);
  textY += game.scale(12);
  textY += game.scale(18);
  const itemsCount = c.inventory.items.length || 0;
  textY += Math.max(1, itemsCount) * game.scale(16);
  const payload = (c as any).carryingItem;
  const carryingCount = (payload && payload.qty > 0 ? 1 : 0)
    + (c.carryingWheat && c.carryingWheat > 0 ? 1 : 0)
    + (c.carryingBread && c.carryingBread > 0 ? 1 : 0);
  if (carryingCount > 0) {
    textY += game.scale(12);
    textY += game.scale(18);
    textY += carryingCount * game.scale(16);
  }
  return Math.max(h, textY + game.scale(8));
}

export function measureSocialTabHeight(game: any, c: any, y: number, h: number): number {
  let textY = y + game.scale(8);
  textY += game.scale(24);
  textY += game.scale(16);
  textY += game.scale(16);
  textY += game.scale(18);
  const otherColonists = (game.colonists as any[]).filter((col) => col !== c && col.alive);
  const count = Math.min(otherColonists.length, 3);
  textY += (count > 0 ? count : 1) * game.scale(16);
  return Math.max(h, textY + game.scale(8));
}

export function measureLogTabHeight(game: any, c: any, y: number, h: number): number {
  let textY = y + game.scale(8);
  textY += game.scale(24);
  const rowH = game.scale(16);
  const entries = c.activityLog || [];
  if (entries.length === 0) {
    return Math.max(h, textY + rowH);
  }
  textY += entries.length * rowH;
  return Math.max(h, textY + game.scale(8));
}
