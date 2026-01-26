/**
 * RimWorld-inspired Health Tab for Colonist Profile
 * 
 * Features:
 * - Overview tab with creature info, self-tend option, bodily systems
 * - Operations tab for surgical procedures (queuing, managing bills)
 * - Injuries tab with detailed injury display, bleeding indicators, treatment status
 * - Temperature injuries (hypothermia, heatstroke, frostbite, burns)
 * - Transplants, limb replacements, implants, amputations
 */

import type { Colonist, ColonistHealth, BodyPart, Injury, Operation, OperationType } from '../../types';
import { initializeColonistHealth } from '../../health/healthSystem';

// Bodily system definitions (RimWorld-style)
interface BodySystem {
  name: string;
  biologicalParts?: string[]; // Body parts that affect this system
  mechanicalParts?: string[]; // Mechanical replacements
  fatal: boolean; // Death if capacity reaches 0%
  biologicalColonist: boolean; // Do biological colonists have this?
  mechanicalColonist: boolean; // Do mechanical colonists have this?
}

const BODY_SYSTEMS: BodySystem[] = [
  { name: 'Pain', biologicalColonist: true, mechanicalColonist: false, fatal: false },
  { name: 'Consciousness', biologicalParts: ['head'], biologicalColonist: true, mechanicalColonist: false, fatal: true },
  { name: 'Data Processing', mechanicalParts: ['mechanical_brain'], biologicalColonist: false, mechanicalColonist: true, fatal: true },
  { name: 'Sight', biologicalParts: ['left_eye', 'right_eye'], mechanicalParts: ['sight_sensor'], biologicalColonist: true, mechanicalColonist: true, fatal: false },
  { name: 'Hearing', biologicalParts: ['left_ear', 'right_ear'], mechanicalParts: ['hearing_sensor'], biologicalColonist: true, mechanicalColonist: true, fatal: false },
  { name: 'Moving', biologicalParts: ['left_leg', 'right_leg'], mechanicalParts: ['left_leg', 'right_leg'], biologicalColonist: true, mechanicalColonist: true, fatal: false },
  { name: 'Manipulation', biologicalParts: ['left_arm', 'right_arm'], mechanicalParts: ['left_arm', 'right_arm'], biologicalColonist: true, mechanicalColonist: true, fatal: false },
  { name: 'Talking', biologicalParts: ['jaw', 'neck'], biologicalColonist: true, mechanicalColonist: false, fatal: false },
  { name: 'Communication', mechanicalParts: ['neck'], biologicalColonist: false, mechanicalColonist: true, fatal: false },
  { name: 'Breathing', biologicalParts: ['lungs'], biologicalColonist: true, mechanicalColonist: false, fatal: true },
  { name: 'Blood Filtration', biologicalParts: ['kidneys', 'liver'], biologicalColonist: true, mechanicalColonist: false, fatal: true },
  { name: 'Fluid Reprocessing', mechanicalParts: ['fluid_reprocessor'], biologicalColonist: false, mechanicalColonist: true, fatal: true },
  { name: 'Blood Pumping', biologicalParts: ['heart'], biologicalColonist: true, mechanicalColonist: false, fatal: true },
  { name: 'Power Generation', mechanicalParts: ['reactor'], biologicalColonist: false, mechanicalColonist: true, fatal: true },
  { name: 'Digestion', biologicalParts: ['stomach'], biologicalColonist: true, mechanicalColonist: false, fatal: true }
];

interface HealthTabContext {
  game: any;
  colonist: Colonist;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Main health tab renderer
 */
export function drawHealthTab(game: any, c: Colonist, x: number, y: number, w: number, h: number): void {
  const ctx: HealthTabContext = { game, colonist: c, x, y, w, h };
  if (!c.health) {
    initializeColonistHealth(c);
  }
  
  // Initialize sub-tab if not set
  if (!game.colonistHealthSubTab) {
    game.colonistHealthSubTab = 'overview';
  }
  
  // Draw sub-tabs
  const subTabY = y + game.scale(4);
  const subTabHeight = game.scale(26);
  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Operations' },
    { id: 'injuries', label: 'Injuries' }
  ];
  
  game.colonistHealthSubTabRects = [];
  const subTabWidth = Math.min((w - game.scale(16)) / subTabs.length, game.scale(120));
  
  const canvasCtx = game.ctx as CanvasRenderingContext2D;
  for (let i = 0; i < subTabs.length; i++) {
    const tab = subTabs[i];
    const tabX = x + game.scale(8) + i * subTabWidth;
    const isActive = game.colonistHealthSubTab === tab.id;
    
    canvasCtx.fillStyle = isActive ? '#1e3a5f' : '#0f172a';
    canvasCtx.fillRect(tabX, subTabY, subTabWidth - game.scale(4), subTabHeight);
    
    if (isActive) {
      canvasCtx.strokeStyle = '#60a5fa';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(tabX + .5, subTabY + .5, subTabWidth - game.scale(4) - 1, subTabHeight - 1);
    } else {
      canvasCtx.strokeStyle = '#334155';
      canvasCtx.lineWidth = 1;
      canvasCtx.strokeRect(tabX + .5, subTabY + .5, subTabWidth - game.scale(4) - 1, subTabHeight - 1);
    }
    
    canvasCtx.fillStyle = isActive ? '#dbeafe' : '#94a3b8';
    canvasCtx.font = game.getScaledFont(11, isActive ? '600' : '500');
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(tab.label, tabX + (subTabWidth - game.scale(4)) / 2, subTabY + subTabHeight / 2);
    
    game.colonistHealthSubTabRects.push({ 
      tab: tab.id, 
      x: tabX, 
      y: subTabY, 
      w: subTabWidth - game.scale(4), 
      h: subTabHeight 
    });
  }
  
  const contentY = subTabY + subTabHeight + game.scale(8);
  const contentH = h - (contentY - y);
  
  // Render active sub-tab
  switch (game.colonistHealthSubTab) {
    case 'overview':
      drawOverviewTab(ctx, contentY, contentH);
      break;
    case 'operations':
      drawOperationsTab(ctx, contentY, contentH);
      break;
    case 'injuries':
      drawInjuriesTab(ctx, contentY, contentH);
      break;
  }
}

export function measureHealthTabHeight(game: any, c: Colonist, x: number, y: number, w: number, h: number): number {
  if (!c.health) {
    initializeColonistHealth(c);
  }
  if (!game.colonistHealthSubTab) {
    game.colonistHealthSubTab = 'overview';
  }

  const subTabY = y + game.scale(4);
  const subTabHeight = game.scale(26);
  const contentY = subTabY + subTabHeight + game.scale(8);

  let contentHeight = h;
  switch (game.colonistHealthSubTab) {
    case 'overview':
      contentHeight = measureOverviewHeight(game, c, contentY, w, h);
      break;
    case 'operations':
      contentHeight = measureOperationsHeight(game, c, contentY, w, h);
      break;
    case 'injuries':
      contentHeight = measureInjuriesHeight(game, c, contentY, w, h);
      break;
  }

  return Math.max(h, (contentY - y) + (contentHeight - contentY));
}

function measureOverviewHeight(game: any, colonist: Colonist, contentY: number, w: number, h: number): number {
  let textY = contentY;
  textY += game.scale(18); // Creature Info title
  textY += game.scale(14) * 3; // Type, Gender, Age
  textY += game.scale(20); // hover hint
  textY += game.scale(22); // self-tend row
  textY += game.scale(18); // Needs title
  textY += game.scale(16); // hunger row
  textY += game.scale(20); // energy row
  textY += game.scale(18); // Bodily Systems title

  const isMechanical = false;
  const relevantSystems = BODY_SYSTEMS.filter((s) => (isMechanical ? s.mechanicalColonist : s.biologicalColonist));
  textY += relevantSystems.length * game.scale(16);

  return Math.max(h, textY + game.scale(8));
}

function measureOperationsHeight(game: any, colonist: Colonist, contentY: number, w: number, h: number): number {
  let textY = contentY;
  textY += game.scale(20); // title

  const isColonist = (colonist as any).alive !== undefined;
  if (!isColonist) {
    return Math.max(h, textY + game.scale(16));
  }

  const health = colonist.health;
  const queuedOps = health?.queuedOperations || [];
  if (queuedOps.length > 0) {
    textY += game.scale(18); // queued title
    for (let i = 0; i < queuedOps.length; i++) {
      textY += game.scale(60) + game.scale(6);
    }
    textY += game.scale(10);
  } else {
    textY += game.scale(24);
  }

  textY += game.scale(18); // available title
  const availableOps = getAvailableOperations(colonist);
  for (const _ of availableOps) {
    textY += game.scale(50) + game.scale(6);
  }
  return Math.max(h, textY + game.scale(8));
}

function measureInjuriesHeight(game: any, colonist: Colonist, contentY: number, w: number, h: number): number {
  let textY = contentY;
  textY += game.scale(20); // title

  const health = colonist.health;
  if (!health || !health.injuries || health.injuries.length === 0) {
    textY += game.scale(20);
    if (health?.implants && health.implants.length > 0) {
      textY += game.scale(18);
      textY += health.implants.length * game.scale(16);
    }
    return Math.max(h, textY + game.scale(8));
  }

  const totalBleeding = health.injuries.reduce((sum, inj) => sum + (inj.bleeding || 0), 0);
  if (totalBleeding > 0) {
    textY += game.scale(20);
  }

  for (let i = 0; i < health.injuries.length; i++) {
    textY += game.scale(50) + game.scale(6);
  }

  return Math.max(h, textY + game.scale(8));
}

/**
 * Overview Tab: Creature info, self-tend, bodily systems
 */
function drawOverviewTab(ctx: HealthTabContext, contentY: number, contentH: number): void {
  const { game, colonist, x, w } = ctx;
  const canvasCtx = game.ctx as CanvasRenderingContext2D;
  let textY = contentY;
  
  // Creature info section
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(14, '600');
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText('Creature Info', x, textY);
  textY += game.scale(18);
  
  const profile = colonist.profile;
  const age = (profile as any)?.age || 25;
  const gender = (profile as any)?.gender || 'Unknown';
  const creatureType = 'Human'; // Could be expanded for animals
  
  canvasCtx.fillStyle = '#94a3b8';
  canvasCtx.font = game.getScaledFont(11, '400');
  canvasCtx.fillText(`Type: ${creatureType}`, x + game.scale(8), textY);
  textY += game.scale(14);
  canvasCtx.fillText(`Gender: ${gender}`, x + game.scale(8), textY);
  textY += game.scale(14);
  canvasCtx.fillText(`Age: ${age} years`, x + game.scale(8), textY);
  textY += game.scale(14);
  
  // Hover for detailed age info (placeholder)
  canvasCtx.fillStyle = '#6b7280';
  canvasCtx.font = game.getScaledFont(9, '400');
  canvasCtx.fillText('(hover for exact age and birth date)', x + game.scale(8), textY);
  textY += game.scale(20);
  
  // Self-tend toggle
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(13, '600');
  canvasCtx.fillText('Self-tend', x, textY);
  
  const selfTendEnabled = (colonist as any).selfTend || false;
  const toggleX = x + game.scale(90);
  const toggleY = textY - game.scale(6);
  const toggleW = game.scale(40);
  const toggleH = game.scale(18);
  
  // Store clickable area
  if (!game.colonistHealthToggles) game.colonistHealthToggles = [];
  game.colonistHealthToggles.push({
    type: 'selfTend',
    x: toggleX,
    y: toggleY,
    w: toggleW,
    h: toggleH
  });
  
  // Draw toggle
  canvasCtx.fillStyle = selfTendEnabled ? '#22c55e' : '#374151';
  canvasCtx.fillRect(toggleX, toggleY, toggleW, toggleH);
  canvasCtx.strokeStyle = selfTendEnabled ? '#16a34a' : '#1e293b';
  canvasCtx.strokeRect(toggleX + .5, toggleY + .5, toggleW - 1, toggleH - 1);
  
  canvasCtx.fillStyle = selfTendEnabled ? '#dcfce7' : '#6b7280';
  canvasCtx.font = game.getScaledFont(9, '600');
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText(selfTendEnabled ? 'ON' : 'OFF', toggleX + toggleW / 2, toggleY + toggleH / 2 + game.scale(1));
  canvasCtx.textAlign = 'left';
  
  if (!selfTendEnabled) {
    canvasCtx.fillStyle = '#6b7280';
    canvasCtx.font = game.getScaledFont(9, '400');
    canvasCtx.fillText('(reduced efficiency)', x + game.scale(135), textY);
  }
  textY += game.scale(22);
  
  // Needs section (Hunger and Fatigue)
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(14, '600');
  canvasCtx.fillText('Needs', x, textY);
  textY += game.scale(18);
  
  // Hunger bar
  const hunger = colonist.hunger || 0;
  const hungerPercent = Math.round(hunger);
  const hungerColor = hunger > 80 ? '#dc2626' : hunger > 60 ? '#f59e0b' : '#22c55e';
  
  canvasCtx.fillStyle = '#cbd5e1';
  canvasCtx.font = game.getScaledFont(11, '500');
  canvasCtx.fillText('Hunger', x + game.scale(8), textY);
  
  const barWidth = Math.min(game.scale(100), w * 0.3);
  const barHeight = game.scale(8);
  const barX = x + game.scale(140);
  
  canvasCtx.fillStyle = '#374151';
  canvasCtx.fillRect(barX, textY - game.scale(6), barWidth, barHeight);
  
  canvasCtx.fillStyle = hungerColor;
  canvasCtx.fillRect(barX, textY - game.scale(6), barWidth * (hunger / 100), barHeight);
  
  canvasCtx.fillStyle = hunger > 60 ? '#fbbf24' : '#9ca3af';
  canvasCtx.font = game.getScaledFont(9, '500');
  canvasCtx.textAlign = 'right';
  canvasCtx.fillText(`${hungerPercent}%`, barX + barWidth + game.scale(30), textY);
  canvasCtx.textAlign = 'left';
  
  if (hunger > 90) {
    canvasCtx.fillStyle = '#dc2626';
    canvasCtx.font = game.getScaledFont(9, '700');
    canvasCtx.fillText('STARVING', barX + barWidth + game.scale(35), textY);
  }
  textY += game.scale(16);
  
  // Fatigue bar (energy)
  const fatigue = colonist.fatigue || 0;
  const fatiguePercent = Math.round(fatigue);
  const energyPercent = 100 - fatiguePercent; // Display as energy (inverse of fatigue)
  const energyColor = fatigue > 80 ? '#dc2626' : fatigue > 60 ? '#f59e0b' : '#22c55e';
  
  canvasCtx.fillStyle = '#cbd5e1';
  canvasCtx.font = game.getScaledFont(11, '500');
  canvasCtx.fillText('Energy', x + game.scale(8), textY);
  
  canvasCtx.fillStyle = '#374151';
  canvasCtx.fillRect(barX, textY - game.scale(6), barWidth, barHeight);
  
  canvasCtx.fillStyle = energyColor;
  canvasCtx.fillRect(barX, textY - game.scale(6), barWidth * (energyPercent / 100), barHeight);
  
  canvasCtx.fillStyle = fatigue > 60 ? '#fbbf24' : '#9ca3af';
  canvasCtx.font = game.getScaledFont(9, '500');
  canvasCtx.textAlign = 'right';
  canvasCtx.fillText(`${energyPercent}%`, barX + barWidth + game.scale(30), textY);
  canvasCtx.textAlign = 'left';
  
  if (fatigue > 90) {
    canvasCtx.fillStyle = '#dc2626';
    canvasCtx.font = game.getScaledFont(9, '700');
    canvasCtx.fillText('EXHAUSTED', barX + barWidth + game.scale(35), textY);
  }
  textY += game.scale(20);
  
  // Bodily Systems section
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(14, '600');
  canvasCtx.fillText('Bodily Systems', x, textY);
  textY += game.scale(18);
  
  // Filter systems for biological colonists (default)
  const isMechanical = false; // Could check for implants/traits
  const relevantSystems = BODY_SYSTEMS.filter(s => 
    isMechanical ? s.mechanicalColonist : s.biologicalColonist
  );
  
  const health = colonist.health;
  
  for (const system of relevantSystems) {
    const capacity = calculateSystemCapacity(system, health);
    const color = getCapacityColor(capacity, system.fatal);
    
    canvasCtx.fillStyle = '#cbd5e1';
    canvasCtx.font = game.getScaledFont(11, '500');
    canvasCtx.fillText(system.name, x + game.scale(8), textY);
    
    // Capacity bar
    const barWidth = Math.min(game.scale(100), w * 0.3);
    const barHeight = game.scale(8);
    const barX = x + game.scale(140);
    
    canvasCtx.fillStyle = '#374151';
    canvasCtx.fillRect(barX, textY - game.scale(6), barWidth, barHeight);
    
    canvasCtx.fillStyle = color;
    canvasCtx.fillRect(barX, textY - game.scale(6), barWidth * (capacity / 100), barHeight);
    
    canvasCtx.fillStyle = capacity < 50 ? '#fbbf24' : '#9ca3af';
    canvasCtx.font = game.getScaledFont(9, '500');
    canvasCtx.textAlign = 'right';
    canvasCtx.fillText(`${capacity}%`, barX + barWidth + game.scale(30), textY);
    canvasCtx.textAlign = 'left';
    
    // Fatal indicator
    if (system.fatal && capacity < 30) {
      canvasCtx.fillStyle = '#dc2626';
      canvasCtx.font = game.getScaledFont(9, '700');
      canvasCtx.fillText('CRITICAL', barX + barWidth + game.scale(35), textY);
    }
    
    textY += game.scale(16);
    
    // Stop if we're running out of space
    if (textY > contentY + contentH - game.scale(20)) {
      canvasCtx.fillStyle = '#6b7280';
      canvasCtx.font = game.getScaledFont(9, '400');
      canvasCtx.fillText('...more systems', x + game.scale(8), textY);
      break;
    }
  }
}

/**
 * Operations Tab: Surgical procedures (colonists/prisoners/animals only)
 */
function drawOperationsTab(ctx: HealthTabContext, contentY: number, contentH: number): void {
  const { game, colonist, x, y, w, h } = ctx;
  const canvasCtx = game.ctx as CanvasRenderingContext2D;
  let textY = contentY;
  
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(14, '600');
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText('Surgical Operations', x, textY);
  textY += game.scale(20);
  
  const health = colonist.health;
  
  // Check if operations are available (only for colonists)
  const isColonist = colonist.alive !== undefined; // Simple check
  if (!isColonist) {
    canvasCtx.fillStyle = '#6b7280';
    canvasCtx.font = game.getScaledFont(11, '400');
    canvasCtx.fillText('Operations not available for this creature', x + game.scale(8), textY);
    return;
  }
  
  // Display queued operations
  const queuedOps = health?.queuedOperations || [];
  
  if (queuedOps.length > 0) {
    canvasCtx.fillStyle = '#f1f5f9';
    canvasCtx.font = game.getScaledFont(13, '600');
    canvasCtx.fillText('Queued Operations', x, textY);
    textY += game.scale(18);
    
    for (let i = 0; i < queuedOps.length; i++) {
      const op = queuedOps[i];
      const opH = game.scale(60);
      const opY = textY;
      
      // Operation background
      canvasCtx.fillStyle = '#1e293b';
      canvasCtx.fillRect(x, opY, w - game.scale(16), opH);
      canvasCtx.strokeStyle = '#475569';
      canvasCtx.strokeRect(x + .5, opY + .5, w - game.scale(16) - 1, opH - 1);
      
      // Priority indicator
      const priorityColor = op.priority >= 7 ? '#dc2626' : op.priority >= 4 ? '#f59e0b' : '#22c55e';
      canvasCtx.fillStyle = priorityColor;
      canvasCtx.fillRect(x, opY, game.scale(4), opH);
      
      // Operation label
      canvasCtx.fillStyle = '#f1f5f9';
      canvasCtx.font = game.getScaledFont(12, '600');
      canvasCtx.fillText(op.label, x + game.scale(10), opY + game.scale(14));
      
      // Description
      canvasCtx.fillStyle = '#94a3b8';
      canvasCtx.font = game.getScaledFont(9, '400');
      canvasCtx.fillText(op.description, x + game.scale(10), opY + game.scale(28));
      
      // Requirements
      canvasCtx.fillStyle = op.requiresMedicine ? '#fbbf24' : '#6b7280';
      canvasCtx.fillText(
        op.requiresMedicine ? '⚠ Requires Medicine (anesthetic)' : 'No medicine required',
        x + game.scale(10), 
        opY + game.scale(40)
      );
      
      // Success chance if calculated
      if (op.successChance !== undefined) {
        const chancePercent = Math.round(op.successChance * 100);
        const chanceColor = chancePercent >= 80 ? '#22c55e' : chancePercent >= 50 ? '#fbbf24' : '#dc2626';
        canvasCtx.fillStyle = chanceColor;
        canvasCtx.font = game.getScaledFont(10, '600');
        canvasCtx.fillText(`${chancePercent}% success`, x + w - game.scale(90), opY + game.scale(14));
      }
      
      // Cancel button
      const cancelW = game.scale(50);
      const cancelH = game.scale(20);
      const cancelX = x + w - game.scale(70);
      const cancelY = opY + opH - game.scale(26);
      
      // Store clickable area for cancel
      if (!game.colonistHealthOperationButtons) game.colonistHealthOperationButtons = [];
      game.colonistHealthOperationButtons.push({
        type: 'cancel',
        operationId: op.id,
        x: cancelX,
        y: cancelY,
        w: cancelW,
        h: cancelH
      });
      
      canvasCtx.fillStyle = '#7f1d1d';
      canvasCtx.fillRect(cancelX, cancelY, cancelW, cancelH);
      canvasCtx.strokeStyle = '#991b1b';
      canvasCtx.strokeRect(cancelX + .5, cancelY + .5, cancelW - 1, cancelH - 1);
      
      canvasCtx.fillStyle = '#fca5a5';
      canvasCtx.font = game.getScaledFont(9, '600');
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('Cancel', cancelX + cancelW / 2, cancelY + cancelH / 2 + game.scale(1));
      canvasCtx.textAlign = 'left';
      
      textY += opH + game.scale(6);
    }
    
    textY += game.scale(10);
  } else {
    canvasCtx.fillStyle = '#6b7280';
    canvasCtx.font = game.getScaledFont(11, '400');
    canvasCtx.fillText('No operations queued', x + game.scale(8), textY);
    textY += game.scale(24);
  }
  
  // Available operations list
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(13, '600');
  canvasCtx.fillText('Available Operations', x, textY);
  textY += game.scale(18);
  
  // Define available operations based on colonist state
  const availableOps = getAvailableOperations(colonist);
  
  if (availableOps.length === 0) {
    canvasCtx.fillStyle = '#6b7280';
    canvasCtx.font = game.getScaledFont(11, '400');
    canvasCtx.fillText('No operations available', x + game.scale(8), textY);
    return;
  }
  
  for (const opDef of availableOps) {
    if (textY > contentY + contentH - game.scale(50)) {
      canvasCtx.fillStyle = '#6b7280';
      canvasCtx.font = game.getScaledFont(9, '400');
      canvasCtx.fillText('...more operations available', x + game.scale(8), textY);
      break;
    }
    
    const opH = game.scale(50);
    const opY = textY;
    
    // Operation item background
    canvasCtx.fillStyle = '#0f172a';
    canvasCtx.fillRect(x, opY, w - game.scale(16), opH);
    canvasCtx.strokeStyle = '#334155';
    canvasCtx.strokeRect(x + .5, opY + .5, w - game.scale(16) - 1, opH - 1);
    
    // Operation icon/type
    const icon = getOperationIcon(opDef.type);
    canvasCtx.fillStyle = '#f1f5f9';
    canvasCtx.font = game.getScaledFont(16);
    canvasCtx.fillText(icon, x + game.scale(8), opY + game.scale(16));
    
    // Operation name
    canvasCtx.fillStyle = '#e2e8f0';
    canvasCtx.font = game.getScaledFont(11, '600');
    canvasCtx.fillText(opDef.label, x + game.scale(32), opY + game.scale(14));
    
    // Description
    canvasCtx.fillStyle = '#94a3b8';
    canvasCtx.font = game.getScaledFont(9, '400');
    canvasCtx.fillText(opDef.description, x + game.scale(32), opY + game.scale(28));
    
    // Medicine requirement
    if (opDef.requiresMedicine) {
      canvasCtx.fillStyle = '#fbbf24';
      canvasCtx.fillText('Requires: Medicine', x + game.scale(32), opY + game.scale(40));
    }
    
    // Add button
    const buttonW = game.scale(50);
    const buttonH = game.scale(22);
    const buttonX = x + w - game.scale(66);
    const buttonY = opY + game.scale(14);
    
    // Store clickable area
    if (!game.colonistHealthOperationButtons) game.colonistHealthOperationButtons = [];
    game.colonistHealthOperationButtons.push({
      type: 'add',
      operation: opDef,
      x: buttonX,
      y: buttonY,
      w: buttonW,
      h: buttonH
    });
    
    canvasCtx.fillStyle = '#1e40af';
    canvasCtx.fillRect(buttonX, buttonY, buttonW, buttonH);
    canvasCtx.strokeStyle = '#3b82f6';
    canvasCtx.strokeRect(buttonX + .5, buttonY + .5, buttonW - 1, buttonH - 1);
    
    canvasCtx.fillStyle = '#dbeafe';
    canvasCtx.font = game.getScaledFont(9, '600');
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('Add', buttonX + buttonW / 2, buttonY + buttonH / 2 + game.scale(1));
    canvasCtx.textAlign = 'left';
    
    textY += opH + game.scale(6);
  }
}

/**
 * Injuries Tab: Detailed injury list with treatment status
 */
function drawInjuriesTab(ctx: HealthTabContext, contentY: number, contentH: number): void {
  const { game, colonist, x, w } = ctx;
  const canvasCtx = game.ctx as CanvasRenderingContext2D;
  let textY = contentY;
  
  canvasCtx.fillStyle = '#f1f5f9';
  canvasCtx.font = game.getScaledFont(14, '600');
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText('Health Conditions & Injuries', x, textY);
  textY += game.scale(20);
  
  const health = colonist.health;
  
  if (!health || !health.injuries || health.injuries.length === 0) {
    canvasCtx.fillStyle = '#22c55e';
    canvasCtx.font = game.getScaledFont(12, '500');
    canvasCtx.fillText('✓ No active injuries or health conditions', x + game.scale(8), textY);
    textY += game.scale(20);
    
    // Show implants if any
    if (health?.implants && health.implants.length > 0) {
      canvasCtx.fillStyle = '#f1f5f9';
      canvasCtx.font = game.getScaledFont(13, '600');
      canvasCtx.fillText('Implants & Prosthetics', x, textY);
      textY += game.scale(18);
      
      for (const implant of health.implants) {
        canvasCtx.fillStyle = '#60a5fa';
        canvasCtx.font = game.getScaledFont(11, '400');
        canvasCtx.fillText(`• ${implant.label}`, x + game.scale(8), textY);
        
        const quality = Math.round((implant.quality || 1) * 100);
        canvasCtx.fillStyle = '#10b981';
        canvasCtx.fillText(`(${quality}% efficiency)`, x + game.scale(150), textY);
        textY += game.scale(16);
      }
    }
    return;
  }
  
  // Overall bleeding rate at the top
  const totalBleeding = health.injuries.reduce((sum, inj) => sum + (inj.bleeding || 0), 0);
  if (totalBleeding > 0) {
    canvasCtx.fillStyle = '#dc2626';
    canvasCtx.font = game.getScaledFont(12, '700');
    const bleedingPercentage = Math.round(totalBleeding * 100);
    canvasCtx.fillText(`⚠ BLEEDING: ${bleedingPercentage}% per day`, x, textY);
    
    // Bleeding droplet indicator
    const dropletSize = Math.min(Math.max(game.scale(8), game.scale(8 + bleedingPercentage / 10)), game.scale(20));
    canvasCtx.fillStyle = '#dc2626';
    canvasCtx.beginPath();
    canvasCtx.arc(x + w - game.scale(30), textY - game.scale(4), dropletSize / 2, 0, Math.PI * 2);
    canvasCtx.fill();
    
    textY += game.scale(20);
  }
  
  // List all injuries
  for (const injury of health.injuries) {
    if (textY > contentY + contentH - game.scale(50)) {
      canvasCtx.fillStyle = '#6b7280';
      canvasCtx.font = game.getScaledFont(10, '400');
      canvasCtx.fillText(`...and ${health.injuries.length - health.injuries.indexOf(injury)} more`, x + game.scale(8), textY);
      break;
    }
    
    const injuryY = textY;
    const injuryH = game.scale(50);
    
    // Injury background
    canvasCtx.fillStyle = '#0f172a';
    canvasCtx.fillRect(x + game.scale(4), injuryY, w - game.scale(8), injuryH);
    canvasCtx.strokeStyle = injury.infected ? '#dc2626' : '#1e293b';
    canvasCtx.lineWidth = injury.infected ? 2 : 1;
    canvasCtx.strokeRect(x + game.scale(4) + .5, injuryY + .5, w - game.scale(8) - 1, injuryH - 1);
    
    // Injury icon
    const typeIcons: Record<string, string> = {
      'cut': '🔪',
      'bruise': '🟣',
      'burn': '🔥',
      'bite': '🦷',
      'gunshot': '🔫',
      'fracture': '🦴'
    };
    const icon = typeIcons[injury.type] || '⚕️';
    
    // Bleeding indicator
    let indicatorX = x + game.scale(12);
    if (injury.bleeding > 0) {
      const dropletSize = game.scale(8 + Math.min(injury.bleeding * 20, 12));
      canvasCtx.fillStyle = '#dc2626';
      canvasCtx.beginPath();
      canvasCtx.arc(indicatorX, injuryY + game.scale(12), dropletSize / 2, 0, Math.PI * 2);
      canvasCtx.fill();
      indicatorX += game.scale(20);
    }
    
    // Treatment status indicator
    const needsTending = !injury.bandaged && injury.severity > 0.1;
    const isTended = injury.bandaged || (injury.treatmentQuality && injury.treatmentQuality > 0);
    
    if (needsTending) {
      // Open circle - needs tending
      canvasCtx.strokeStyle = '#fbbf24';
      canvasCtx.lineWidth = 2;
      canvasCtx.beginPath();
      canvasCtx.arc(indicatorX, injuryY + game.scale(12), game.scale(6), 0, Math.PI * 2);
      canvasCtx.stroke();
      indicatorX += game.scale(18);
    } else if (isTended) {
      // Solid circle - tended
      canvasCtx.fillStyle = '#22c55e';
      canvasCtx.beginPath();
      canvasCtx.arc(indicatorX, injuryY + game.scale(12), game.scale(6), 0, Math.PI * 2);
      canvasCtx.fill();
      indicatorX += game.scale(18);
    }
    
    // Bandage quality indicator
    if (injury.bandaged || (injury.treatmentQuality && injury.treatmentQuality > 0)) {
      const quality = injury.treatmentQuality || 0.5;
      const bandageColor = quality > 0.8 ? '#ffffff' : quality > 0.5 ? '#cbd5e1' : '#6b7280';
      
      canvasCtx.fillStyle = bandageColor;
      canvasCtx.font = game.getScaledFont(12);
      canvasCtx.fillText('🩹', indicatorX, injuryY + game.scale(12));
      indicatorX += game.scale(20);
    }
    
    // Injury description
    canvasCtx.fillStyle = injury.infected ? '#fca5a5' : '#f87171';
    canvasCtx.font = game.getScaledFont(11, '600');
    canvasCtx.fillText(`${icon} ${injury.description}`, indicatorX, injuryY + game.scale(12));
    
    // Body part
    canvasCtx.fillStyle = '#94a3b8';
    canvasCtx.font = game.getScaledFont(9, '400');
    const bodyPartLabel = formatBodyPartLabel(injury.bodyPart);
    canvasCtx.fillText(`on ${bodyPartLabel}`, indicatorX, injuryY + game.scale(24));
    
    // Severity and pain
    const severity = Math.round(injury.severity * 100);
    const pain = Math.round(injury.pain * 100);
    
    canvasCtx.fillStyle = '#cbd5e1';
    canvasCtx.font = game.getScaledFont(9, '500');
    canvasCtx.fillText(`Severity: ${severity}%`, indicatorX, injuryY + game.scale(36));
    
    canvasCtx.fillStyle = '#fbbf24';
    canvasCtx.fillText(`Pain: ${pain}%`, indicatorX + game.scale(80), injuryY + game.scale(36));
    
    // Additional status
    if (injury.infected) {
      canvasCtx.fillStyle = '#dc2626';
      canvasCtx.font = game.getScaledFont(10, '700');
      canvasCtx.fillText('INFECTED', x + w - game.scale(70), injuryY + game.scale(12));
    }
    
    if (injury.permanent) {
      canvasCtx.fillStyle = '#a78bfa';
      canvasCtx.font = game.getScaledFont(9, '500');
      canvasCtx.fillText('Permanent', x + w - game.scale(70), injuryY + game.scale(36));
    }
    
    textY += injuryH + game.scale(6);
  }
  
  // Show implants at the bottom
  if (health?.implants && health.implants.length > 0 && textY < contentY + contentH - game.scale(60)) {
    textY += game.scale(8);
    canvasCtx.fillStyle = '#f1f5f9';
    canvasCtx.font = game.getScaledFont(13, '600');
    canvasCtx.fillText('Implants & Prosthetics', x, textY);
    textY += game.scale(18);
    
    for (const implant of health.implants) {
      if (textY > contentY + contentH - game.scale(20)) break;
      
      canvasCtx.fillStyle = '#60a5fa';
      canvasCtx.font = game.getScaledFont(11, '400');
      canvasCtx.fillText(`• ${implant.label}`, x + game.scale(8), textY);
      
      const quality = Math.round((implant.quality || 1) * 100);
      canvasCtx.fillStyle = '#10b981';
      canvasCtx.fillText(`(${quality}% efficiency)`, x + game.scale(150), textY);
      textY += game.scale(16);
    }
  }
}

/**
 * Calculate system capacity based on body parts and injuries
 */
function calculateSystemCapacity(system: BodySystem, health?: ColonistHealth): number {
  if (!health) return 100;
  
  // Special handling for specific systems
  switch (system.name) {
    case 'Pain':
      return Math.max(0, Math.min(100, 100 - (health.totalPain || 0) * 100));
    case 'Consciousness':
      return Math.round((health.consciousness || 1) * 100);
    case 'Moving':
      return Math.round((health.mobility || 1) * 100);
    case 'Manipulation':
      return Math.round((health.manipulation || 1) * 100);
    case 'Blood Pumping':
      return Math.round((health.bloodLevel || 1) * 100);
    case 'Blood Filtration':
      const kidneyHealth = health.kidneyHealth || 1;
      const liverHealth = health.liverHealth || 1;
      return Math.round(((kidneyHealth + liverHealth) / 2) * 100);
    default:
      // For other systems, check relevant body parts
      if (system.biologicalParts) {
        const relevantParts = health.bodyParts?.filter(bp => 
          system.biologicalParts!.includes(bp.type)
        );
        
        if (relevantParts && relevantParts.length > 0) {
          const avgEfficiency = relevantParts.reduce((sum, part) => 
            sum + part.efficiency, 0) / relevantParts.length;
          return Math.round(avgEfficiency * 100);
        }
      }
      return 100;
  }
}

/**
 * Get color for capacity percentage
 */
function getCapacityColor(capacity: number, isFatal: boolean): string {
  if (isFatal) {
    if (capacity < 25) return '#dc2626'; // Critical - red
    if (capacity < 50) return '#f59e0b'; // Warning - orange
    if (capacity < 80) return '#fbbf24'; // Caution - yellow
    return '#22c55e'; // Good - green
  } else {
    if (capacity < 30) return '#f59e0b';
    if (capacity < 70) return '#fbbf24';
    return '#22c55e';
  }
}

/**
 * Format body part type as readable label
 */
function formatBodyPartLabel(bodyPart: string): string {
  return bodyPart
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get available operations for a colonist based on their current state
 */
function getAvailableOperations(colonist: Colonist): Array<{
  type: OperationType;
  label: string;
  description: string;
  requiresMedicine: boolean;
  targetBodyPart?: string;
}> {
  const ops: Array<{
    type: OperationType;
    label: string;
    description: string;
    requiresMedicine: boolean;
    targetBodyPart?: string;
  }> = [];
  
  const health = colonist.health;
  if (!health) return ops;
  
  // Check for infected injuries that could be amputated
  const infectedInjuries = health.injuries?.filter(inj => inj.infected && inj.severity > 0.6) || [];
  for (const injury of infectedInjuries) {
    if (injury.bodyPart === 'left_arm' || injury.bodyPart === 'right_arm' || 
        injury.bodyPart === 'left_leg' || injury.bodyPart === 'right_leg') {
      ops.push({
        type: 'amputate',
        label: `Amputate ${formatBodyPartLabel(injury.bodyPart)}`,
        description: 'Remove infected limb to save colonist',
        requiresMedicine: true,
        targetBodyPart: injury.bodyPart
      });
    }
  }
  
  // Check for missing/amputated parts that could be replaced
  const missingParts = health.bodyParts?.filter(bp => bp.missing) || [];
  for (const part of missingParts) {
    if (part.type === 'left_leg' || part.type === 'right_leg') {
      ops.push({
        type: 'install_prosthetic',
        label: `Install Peg Leg (${formatBodyPartLabel(part.type)})`,
        description: 'Basic prosthetic (-15% movement)',
        requiresMedicine: true,
        targetBodyPart: part.type
      });
      ops.push({
        type: 'install_prosthetic',
        label: `Install Bionic Leg (${formatBodyPartLabel(part.type)})`,
        description: 'Advanced prosthetic (+12.5% movement)',
        requiresMedicine: true,
        targetBodyPart: part.type
      });
    }
    if (part.type === 'left_arm' || part.type === 'right_arm') {
      ops.push({
        type: 'install_prosthetic',
        label: `Install Prosthetic Arm (${formatBodyPartLabel(part.type)})`,
        description: 'Basic prosthetic (reduced manipulation)',
        requiresMedicine: true,
        targetBodyPart: part.type
      });
      ops.push({
        type: 'install_prosthetic',
        label: `Install Bionic Arm (${formatBodyPartLabel(part.type)})`,
        description: 'Advanced prosthetic (+12.5% manipulation)',
        requiresMedicine: true,
        targetBodyPart: part.type
      });
    }
  }
  
  // Augmentation options (install bionics on healthy parts)
  const healthyParts = health.bodyParts?.filter(bp => !bp.missing && !bp.replaced && bp.efficiency > 0.9) || [];
  for (const part of healthyParts) {
    if (part.type === 'left_eye' || part.type === 'right_eye') {
      ops.push({
        type: 'install_implant',
        label: `Install Bionic Eye (${formatBodyPartLabel(part.type)})`,
        description: 'Enhanced sight (+25% sight)',
        requiresMedicine: true,
        targetBodyPart: part.type
      });
    }
  }
  
  // Organ transplants for damaged organs
  if (health.heartHealth && health.heartHealth < 0.5) {
    ops.push({
      type: 'transplant_organ',
      label: 'Heart Transplant',
      description: 'Cure artery blockages and heart damage',
      requiresMedicine: true,
      targetBodyPart: 'heart'
    });
  }
  
  if (health.lungHealth && health.lungHealth < 0.5) {
    ops.push({
      type: 'transplant_organ',
      label: 'Lung Transplant',
      description: 'Cure asthma and lung damage',
      requiresMedicine: true,
      targetBodyPart: 'lungs'
    });
  }
  
  // Scar removal
  const scars = health.injuries?.filter(inj => inj.type === 'scar') || [];
  for (const scar of scars) {
    ops.push({
      type: 'remove_scar',
      label: `Remove Scar (${formatBodyPartLabel(scar.bodyPart)})`,
      description: 'Cosmetic surgery to remove scarring',
      requiresMedicine: true,
      targetBodyPart: scar.bodyPart
    });
  }
  
  // Organ harvesting (controversial - mood penalty)
  const healthyOrgans = ['heart', 'kidneys', 'liver', 'lungs', 'stomach'] as const;
  for (const organ of healthyOrgans) {
    const organPart = health.bodyParts?.find(bp => bp.type === organ);
    if (organPart && !organPart.missing && organPart.efficiency > 0.8) {
      ops.push({
        type: 'harvest_organ',
        label: `Harvest ${formatBodyPartLabel(organ)}`,
        description: '⚠ Kills colonist. -30 mood for all colonists',
        requiresMedicine: true,
        targetBodyPart: organ
      });
    }
  }
  
  return ops;
}

/**
 * Get icon for operation type
 */
function getOperationIcon(type: OperationType): string {
  switch (type) {
    case 'install_implant': return '🔧';
    case 'install_prosthetic': return '🦾';
    case 'amputate': return '✂️';
    case 'harvest_organ': return '💔';
    case 'transplant_organ': return '❤️';
    case 'remove_scar': return '✨';
    case 'treat_infection': return '💊';
    case 'remove_organ': return '🔪';
    default: return '🏥';
  }
}
