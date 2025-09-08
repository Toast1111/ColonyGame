import { drawColonistAvatar } from "../render";
import { ImageAssets } from "../../assets/images";

export function drawColonistProfile(game: any, c: any) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  const cw = game.canvas.width; 
  const ch = game.canvas.height; 

  // Responsive sizing with sensible caps for large monitors
  const maxPanelW = Math.min(860, Math.floor(cw * 0.72));
  const maxPanelH = Math.min(600, Math.floor(ch * 0.78));
  const W = Math.min(game.scale(580), maxPanelW);
  const H = Math.min(game.scale(480), maxPanelH);
  const PAD = game.scale(12);
  // Slightly inset from left, not fully flush; keep top clear of resource HUD
  const X = Math.max(PAD, Math.floor(cw * 0.02));
  const Y = Math.max(game.scale(110), Math.floor(ch * 0.08));
  const finalY = Math.min(Y, ch - H - PAD);

  ctx.save();
  ctx.fillStyle = '#0b1220cc'; 
  ctx.fillRect(X, finalY, W, H);
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(X + .5, finalY + .5, W - 1, H - 1);

  // Header bar to keep the close button unobstructed
  const headerH = game.scale(36);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(X, finalY, W, headerH);
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(X + .5, finalY + .5, W - 1, headerH - 1);

  const closeSize = game.scale(28);
  const closePad = game.scale(6);
  const closeX = X + W - closePad - closeSize;
  const closeY = finalY + Math.floor((headerH - closeSize) / 2);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(closeX, closeY, closeSize, closeSize);
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(closeX + .5, closeY + .5, closeSize - 1, closeSize - 1);
  ctx.fillStyle = '#dbeafe';
  ctx.font = game.getScaledFont(16, '700');
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeX + closeSize / 2, closeY + closeSize / 2 + game.scale(1));

  // Optional panel title on the left side of header
  ctx.fillStyle = '#9fb3c8';
  ctx.textAlign = 'left';
  ctx.font = game.getScaledFont(14, '600');
  ctx.fillText('Colonist', X + game.scale(12), finalY + Math.floor(headerH / 2) + game.scale(1));

  const tabHeight = game.scale(32);
  const tabY = finalY + headerH + game.scale(8);
  const tabs = [
    { id: 'bio', label: 'Bio', icon: '👤' },
    { id: 'health', label: 'Health', icon: '❤️' },
    { id: 'gear', label: 'Gear', icon: '🎒' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'stats', label: 'Stats', icon: '📊' },
    { id: 'log', label: 'Log', icon: '📜' }
  ];

  game.colonistTabRects = [];
  const tabWidth = Math.max(game.scale(70), (W - game.scale(32)) / tabs.length);
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const tabX = X + game.scale(16) + i * tabWidth;
    const isActive = game.colonistProfileTab === tab.id;
    ctx.fillStyle = isActive ? '#1e293b' : '#0f172a';
    ctx.fillRect(tabX, tabY, tabWidth, tabHeight);
    ctx.strokeStyle = isActive ? '#3b82f6' : '#1e293b';
    ctx.strokeRect(tabX + .5, tabY + .5, tabWidth - 1, tabHeight - 1);
    ctx.fillStyle = isActive ? '#60a5fa' : '#9ca3af';
    ctx.font = game.getScaledFont(10, '600');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = tabY + tabHeight / 2;
    ctx.fillText(`${tab.icon} ${tab.label}`, tabX + tabWidth / 2, textY);
    game.colonistTabRects.push({ tab: tab.id, x: tabX, y: tabY, w: tabWidth, h: tabHeight });
  }

  const contentY = tabY + tabHeight + game.scale(10);
  const contentH = H - (contentY - finalY) - game.scale(16);
  ctx.save();
  ctx.beginPath();
  ctx.rect(X + game.scale(8), contentY, W - game.scale(16), contentH);
  ctx.clip();

  switch (game.colonistProfileTab) {
    case 'bio':
      drawBioTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
    case 'health':
      drawHealthTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
    case 'gear':
      drawGearTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
    case 'social':
      drawSocialTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
    case 'stats':
      drawStatsTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
    case 'log':
      drawLogTab(game, c, X + game.scale(16), contentY, W - game.scale(32), contentH);
      break;
  }
  ctx.restore();

  ctx.fillStyle = '#4b5563';
  ctx.font = game.getScaledFont(9);
  ctx.textAlign = 'left';
  ctx.fillText(game.follow ? 'Following (Esc to stop)' : 'Click to follow', X + game.scale(16), finalY + H - game.scale(8));

  game.colonistPanelRect = { x: X, y: finalY, w: W, h: H };
  game.colonistPanelCloseRect = { x: closeX, y: closeY, w: closeSize, h: closeSize };
  ctx.restore();
}

function drawBioTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  let textY = y + game.scale(8);
  const avatarSize = game.scale(64);
  const ax = x + game.scale(8);
  const ay = textY;
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

function drawHealthTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  let textY = y + game.scale(8);
  const hp = Math.max(0, Math.min(100, c.hp | 0));
  const tired = Math.max(0, Math.min(100, (c.fatigue || 0) | 0));
  const hunger = Math.max(0, Math.min(100, (c.hunger || 0) | 0));
  const mood = (game as any).getColonistMood ? (game as any).getColonistMood(c) : 'OK';
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(16, '600'); ctx.textAlign = 'left';
  ctx.fillText('Overall Condition', x, textY); textY += game.scale(24);
  const barSpacing = game.scale(22);
  const availW = w - game.scale(16);
  game.barRow(x, textY, 'Health', hp, '#22c55e', availW); textY += barSpacing;
  game.barRow(x, textY, 'Energy', 100 - tired, '#eab308', availW); textY += barSpacing;
  game.barRow(x, textY, 'Fullness', 100 - hunger, '#f87171', availW); textY += barSpacing;
  textY += game.scale(8);
  // Health system specifics
  const health = (c as any).health;
  if (health) {
    const bloodLoss = Math.round(health.bloodLoss || 0);
    const pain = Math.round(health.pain || 0);
  game.barRow(x, textY, 'Blood Loss', 100 - bloodLoss, '#60a5fa', availW); textY += barSpacing;
  game.barRow(x, textY, 'Pain', pain, '#ef4444', availW); textY += barSpacing;
    textY += game.scale(8);
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Injuries', x, textY); textY += game.scale(18);
    if (!health.injuries || health.injuries.length === 0) {
      ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText('No injuries', x + game.scale(8), textY); textY += game.scale(16);
    } else {
      for (const inj of health.injuries) {
        const line = `${inj.part} — ${inj.kind} (sev ${inj.severity})` + (inj.tended ? ' [tended]' : '') + (inj.infected ? ' [infected]' : '');
        ctx.fillStyle = inj.infected ? '#f87171' : inj.tended ? '#22c55e' : '#dbeafe';
        ctx.font = game.getScaledFont(12, '500');
        ctx.fillText(line, x + game.scale(8), textY); textY += game.scale(16);
        if (textY > y + h - game.scale(60)) break;
      }
    }
    textY += game.scale(8);
    // Quick actions (non-interactive text cues; clicks handled in Game input if wired later)
    const canTend = true;
    const btnW = game.scale(110), btnH = game.scale(24);
    const tendX = x; const rescueX = x + btnW + game.scale(8);
    const btnY = textY;
    // Tend button
    ctx.fillStyle = '#0f172a'; ctx.fillRect(tendX, btnY, btnW, btnH);
    ctx.strokeStyle = '#1e293b'; ctx.strokeRect(tendX + .5, btnY + .5, btnW - 1, btnH - 1);
    ctx.fillStyle = '#22c55e'; ctx.font = game.getScaledFont(12, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Tend', tendX + btnW/2, btnY + btnH/2 + game.scale(1));
    // Rescue button (if downed)
    ctx.fillStyle = '#0f172a'; ctx.fillRect(rescueX, btnY, btnW, btnH);
    ctx.strokeStyle = '#1e293b'; ctx.strokeRect(rescueX + .5, btnY + .5, btnW - 1, btnH - 1);
    ctx.fillStyle = '#60a5fa'; ctx.font = game.getScaledFont(12, '600'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Rescue', rescueX + btnW/2, btnY + btnH/2 + game.scale(1));
    // Record rects for potential click handling
    game.colonistHealthActions = { tend: { x: tendX, y: btnY, w: btnW, h: btnH }, rescue: { x: rescueX, y: btnY, w: btnW, h: btnH } };
  }
  textY += game.scale(16);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600');
  ctx.fillText('Mental State', x, textY); textY += game.scale(18);
  ctx.fillStyle = '#9fb3c8'; ctx.font = game.getScaledFont(12, '400');
  ctx.fillText(`Current Mood: ${mood}`, x + game.scale(8), textY);
}

function drawGearTab(game: any, c: any, x: number, y: number, w: number, h: number) {
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
      // Try draw item icon
      const icon = ImageAssets.getInstance().getItemIcon(item.defName || item.name);
      if (icon) {
        const iconSize = game.scale(18);
        ctx.drawImage(icon, x + game.scale(70), textY - iconSize + game.scale(12), iconSize, iconSize);
      }
      ctx.fillStyle = getItemQualityColor(game, item.quality || 'normal');
      ctx.font = game.getScaledFont(12, '400');
      ctx.fillText(item.name, x + game.scale(94), textY);
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
      // Draw icon if available
      const icon = ImageAssets.getInstance().getItemIcon(item.defName || item.name);
      let textOffset = game.scale(8);
      if (icon) {
        const iconSize = game.scale(16);
        ctx.drawImage(icon, x + textOffset, textY - iconSize + game.scale(12), iconSize, iconSize);
        textOffset += game.scale(20);
      }
      const displayText = `${item.name} (${item.quantity})`;
      ctx.fillText(displayText, x + textOffset, textY);
      ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400');
      ctx.fillText(`${item.quality || 'normal'}`, x + game.scale(150), textY);
      if (item.durability !== undefined) ctx.fillText(`${Math.round(item.durability)}%`, x + game.scale(200), textY);
      textY += game.scale(16);
      if (textY > y + h - game.scale(20)) { ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400'); ctx.fillText('...more items', x + game.scale(8), textY); break; }
    }
  }
  if (c.carrying) {
    textY += game.scale(12);
    ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Currently Carrying', x, textY); textY += game.scale(18);
    ctx.fillStyle = '#22c55e'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText(`${c.carrying.type || 'Item'}`, x + game.scale(8), textY);
  }
}

function drawSocialTab(game: any, c: any, x: number, y: number, w: number, h: number) {
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

function drawStatsTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D; let textY = y + game.scale(8);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(16, '600'); ctx.textAlign = 'left'; ctx.fillText('Skills & Abilities', x, textY); textY += game.scale(24);
  const profile = c.profile;
  if (profile && profile.stats) {
    const stats = [
      { name: 'Work Speed', value: Math.round(profile.stats.workSpeed * 100), suffix: '%' },
      { name: 'Social Bonus', value: Math.round(profile.stats.socialBonus * 100), suffix: '%' },
      { name: 'Hunger Rate', value: Math.round(profile.stats.hungerRate * 100), suffix: '%' },
      { name: 'Fatigue Rate', value: Math.round(profile.stats.fatigueRate * 100), suffix: '%' }
    ];
    for (const stat of stats) {
      ctx.fillStyle = '#94a3b8'; ctx.font = game.getScaledFont(12, '500'); ctx.fillText(`${stat.name}:`, x, textY);
      ctx.fillStyle = '#dbeafe'; ctx.font = game.getScaledFont(12, '400'); ctx.fillText(`${stat.value}${stat.suffix}`, x + game.scale(120), textY);
      textY += game.scale(18);
    }
  }
  textY += game.scale(16);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(14, '600'); ctx.fillText('Skills', x, textY); textY += game.scale(18);
  const skills = [ 'Construction', 'Farming', 'Mining', 'Research', 'Combat' ].map(name => ({ name, level: Math.floor(Math.random() * 10) + 1 }));
  for (const skill of skills) {
    ctx.fillStyle = '#94a3b8'; ctx.font = game.getScaledFont(11, '400'); ctx.fillText(`${skill.name}:`, x + game.scale(8), textY);
    const levelColor = skill.level >= 8 ? '#22c55e' : skill.level >= 5 ? '#eab308' : '#6b7280';
    ctx.fillStyle = levelColor; ctx.fillText(`Level ${skill.level}`, x + game.scale(100), textY);
    textY += game.scale(16);
  }
}

function drawLogTab(game: any, c: any, x: number, y: number, w: number, h: number) {
  const ctx = game.ctx as CanvasRenderingContext2D; let textY = y + game.scale(8);
  ctx.fillStyle = '#f1f5f9'; ctx.font = game.getScaledFont(16, '600'); ctx.textAlign = 'left'; ctx.fillText('Activity Log', x, textY); textY += game.scale(24);
  const activities = [
    { time: `Day ${game.day} 08:30`, action: 'Started construction work', type: 'work' },
    { time: `Day ${game.day} 07:45`, action: 'Finished eating breakfast', type: 'need' },
    { time: `Day ${game.day} 07:00`, action: 'Woke up', type: 'rest' },
    { time: `Day ${game.day - 1} 22:30`, action: 'Went to sleep', type: 'rest' },
    { time: `Day ${game.day - 1} 19:15`, action: 'Had dinner', type: 'need' }
  ];
  for (const activity of activities) {
    const activityColor = activity.type === 'work' ? '#60a5fa' : activity.type === 'need' ? '#22c55e' : activity.type === 'rest' ? '#a78bfa' : '#94a3b8';
    ctx.fillStyle = '#6b7280'; ctx.font = game.getScaledFont(10, '400'); ctx.fillText(activity.time, x, textY);
    ctx.fillStyle = activityColor; ctx.font = game.getScaledFont(11, '400'); ctx.fillText(activity.action, x + game.scale(100), textY);
    textY += game.scale(16);
    if (textY > y + h - game.scale(20)) break;
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
