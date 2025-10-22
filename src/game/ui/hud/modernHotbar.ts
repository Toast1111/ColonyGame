/**
 * Modern Hotbar - Tab-based navigation system
 * 
 * Replaces the old building selection hotbar with a tab system:
 * - Build, Work, Schedule, Research, Animals, Quests
 * - Minimalistic, modern design
 * - Percentage-based sizing for all screen sizes
 */

export type HotbarTab = 'build' | 'work' | 'schedule' | 'research' | 'animals' | 'quests';

export interface HotbarTabRect {
  tab: HotbarTab;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draw the modern hotbar at the bottom of the screen
 */
export function getModernHotbarHeight(canvas: HTMLCanvasElement, game: any): number {
  const isTouch = !!game?.isTouch;
  const scaleFn = typeof game?.scale === 'function' ? game.scale.bind(game) : null;

  const minHeight = scaleFn ? scaleFn(isTouch ? 110 : 68) : (isTouch ? 110 : 68);
  const maxHeightCandidate = scaleFn ? scaleFn(isTouch ? 160 : 96) : (isTouch ? 160 : 96);
  const percentHeight = canvas.height * (isTouch ? 0.095 : 0.06);
  const percentMax = canvas.height * (isTouch ? 0.16 : 0.1);

  const upperBound = Math.max(maxHeightCandidate, percentMax, minHeight);
  const lowerBound = Math.min(minHeight, upperBound);

  return Math.min(Math.max(percentHeight, lowerBound), upperBound);
}

export function drawModernHotbar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  activeTab: HotbarTab | null,
  game: any
): HotbarTabRect[] {
  const tabs: Array<{ id: HotbarTab; label: string; enabled: boolean }> = [
    { id: 'build', label: 'Build', enabled: true },
    { id: 'work', label: 'Work', enabled: true },
    { id: 'schedule', label: 'Schedule', enabled: false },
    { id: 'research', label: 'Research', enabled: true },
    { id: 'animals', label: 'Animals', enabled: false },
    { id: 'quests', label: 'Quests', enabled: false },
  ];

  // Calculate dimensions with touch-friendly scaling
  const hotbarHeight = getModernHotbarHeight(canvas, game);
  const hotbarY = canvas.height - hotbarHeight;
  const isTouch = !!game?.isTouch;
  const scaleFn = typeof game?.scale === 'function' ? game.scale.bind(game) : null;
  const tabPadding = Math.max(
    canvas.width * (isTouch ? 0.007 : 0.005),
    scaleFn ? scaleFn(isTouch ? 10 : 6) : isTouch ? 10 : 6
  );
  const totalPadding = tabPadding * (tabs.length + 1);
  const tabWidth = (canvas.width - totalPadding) / tabs.length;

  // Draw hotbar background
  ctx.fillStyle = 'rgba(11, 18, 40, 0.92)'; // Dark semi-transparent
  ctx.fillRect(0, hotbarY, canvas.width, hotbarHeight);

  // Draw subtle top border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hotbarY);
  ctx.lineTo(canvas.width, hotbarY);
  ctx.stroke();

  const rects: HotbarTabRect[] = [];
  let currentX = tabPadding;

  // Font size scales with hotbar height
  const fontSize = Math.max(
    scaleFn ? scaleFn(isTouch ? 16 : 12) : isTouch ? 16 : 12,
    hotbarHeight * (isTouch ? 0.34 : 0.3)
  );

  for (const tab of tabs) {
    const rect: HotbarTabRect = {
      tab: tab.id,
      x: currentX,
      y: hotbarY,
      w: tabWidth,
      h: hotbarHeight,
    };
    rects.push(rect);

    const isActive = activeTab === tab.id;
    const isEnabled = tab.enabled;

    // Draw tab background
    if (isActive) {
      // Active tab - highlighted
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // Blue tint
    } else if (!isEnabled) {
      // Disabled tab - darker
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    } else {
      // Default tab - subtle background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
    }
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // Draw tab border
    if (isActive) {
      // Active tab gets a top accent
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x + rect.w, rect.y);
      ctx.stroke();
      
      // Side borders
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.moveTo(rect.x + rect.w, rect.y);
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
      ctx.stroke();
    } else {
      // Inactive tabs get subtle borders
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    // Draw tab text
    ctx.font = `${Math.floor(fontSize)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!isEnabled) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)'; // Muted gray for disabled
    } else if (isActive) {
      ctx.fillStyle = 'rgba(219, 234, 254, 1)'; // Bright white-blue
    } else {
      ctx.fillStyle = 'rgba(159, 179, 200, 0.9)'; // Light gray
    }

    ctx.fillText(tab.label, rect.x + rect.w / 2, rect.y + rect.h / 2);

    currentX += tabWidth + tabPadding;
  }

  return rects;
}

/**
 * Handle click on the hotbar
 * Returns the tab that was clicked, or null if no tab was clicked
 */
export function handleHotbarClick(
  mouseX: number,
  mouseY: number,
  hotbarRects: HotbarTabRect[]
): HotbarTab | null {
  for (const rect of hotbarRects) {
    if (
      mouseX >= rect.x &&
      mouseX <= rect.x + rect.w &&
      mouseY >= rect.y &&
      mouseY <= rect.y + rect.h
    ) {
      return rect.tab;
    }
  }
  return null;
}
