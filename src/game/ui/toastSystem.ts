/**
 * Toast Notification System - Modern sliding toast notifications
 * 
 * Features:
 * - Slide in/out animations
 * - Auto-dismiss with progress bar
 * - Different types (info, success, warning, error)
 * - Stack multiple notifications
 */

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  elapsed: number;
  animationProgress: number; // 0 to 1 for slide in/out
  dismissed: boolean;
}

const toasts: Toast[] = [];
let nextToastId = 0;

const TOAST_HEIGHT = 60;
const TOAST_WIDTH = 320;
const TOAST_SPACING = 12;
const SLIDE_SPEED = 8;

export function showToast(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) {
  const toast: Toast = {
    id: nextToastId++,
    message,
    type,
    duration,
    elapsed: 0,
    animationProgress: 0,
    dismissed: false,
  };
  
  toasts.push(toast);
  
  // Auto-dismiss old toasts if stack is too large
  if (toasts.length > 5) {
    toasts[0].dismissed = true;
  }
}

export function updateToasts(deltaTime: number) {
  for (let i = toasts.length - 1; i >= 0; i--) {
    const toast = toasts[i];
    
    // Update elapsed time
    toast.elapsed += deltaTime * 1000; // Convert to ms
    
    // Update animation
    if (!toast.dismissed && toast.animationProgress < 1) {
      toast.animationProgress = Math.min(1, toast.animationProgress + SLIDE_SPEED * deltaTime);
    } else if (toast.dismissed && toast.animationProgress > 0) {
      toast.animationProgress = Math.max(0, toast.animationProgress - SLIDE_SPEED * deltaTime);
    }
    
    // Auto-dismiss after duration
    if (toast.elapsed >= toast.duration && !toast.dismissed) {
      toast.dismissed = true;
    }
    
    // Remove completely animated out toasts
    if (toast.dismissed && toast.animationProgress === 0) {
      toasts.splice(i, 1);
    }
  }
}

export function drawToasts(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, game: any) {
  if (toasts.length === 0) return;
  
  const rightEdge = canvas.width - game.scale(20);
  let yOffset = game.scale(100); // Start below top HUD
  
  ctx.save();
  
  toasts.forEach((toast, index) => {
    const width = game.scale(TOAST_WIDTH);
    const height = game.scale(TOAST_HEIGHT);
    
    // Calculate slide animation
    const slideOffset = (1 - easeOutCubic(toast.animationProgress)) * width;
    const x = rightEdge - width + slideOffset;
    const y = yOffset;
    
    // Get colors based on type
    const colors = getToastColors(toast.type);
    
    // Draw background with rounded corners effect
    ctx.fillStyle = colors.bg;
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw left accent bar
    ctx.fillStyle = colors.accent;
    ctx.fillRect(x, y, game.scale(4), height);
    
    // Draw icon
    ctx.fillStyle = colors.accent;
    ctx.font = game.getScaledFont(24);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const icon = getToastIcon(toast.type);
    ctx.fillText(icon, x + game.scale(16), y + height / 2);
    
    // Draw message
    ctx.fillStyle = '#e2e8f0';
    ctx.font = game.getScaledFont(14, '600');
    
    // Wrap text if needed
    const maxWidth = width - game.scale(60);
    const words = toast.message.split(' ');
    let line = '';
    let lineY = y + game.scale(20);
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x + game.scale(50), lineY);
        line = word;
        lineY += game.scale(18);
      } else {
        line = testLine;
      }
    }
    
    if (line) {
      ctx.fillText(line, x + game.scale(50), lineY);
    }
    
    // Draw progress bar for auto-dismiss
    const progress = toast.elapsed / toast.duration;
    const progressWidth = width - game.scale(8);
    const progressHeight = game.scale(3);
    const progressX = x + game.scale(4);
    const progressY = y + height - game.scale(6);
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    
    // Progress fill
    ctx.fillStyle = colors.accent;
    ctx.fillRect(progressX, progressY, progressWidth * (1 - progress), progressHeight);
    
    yOffset += height + game.scale(TOAST_SPACING);
  });
  
  ctx.restore();
}

function getToastColors(type: 'info' | 'success' | 'warning' | 'error') {
  switch (type) {
    case 'success':
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        border: 'rgba(16, 185, 129, 0.5)',
        accent: '#10b981',
      };
    case 'warning':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.5)',
        accent: '#f59e0b',
      };
    case 'error':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.5)',
        accent: '#ef4444',
      };
    case 'info':
    default:
      return {
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.5)',
        accent: '#3b82f6',
      };
  }
}

function getToastIcon(type: 'info' | 'success' | 'warning' | 'error'): string {
  switch (type) {
    case 'success': return '✓';
    case 'warning': return '⚠';
    case 'error': return '✗';
    case 'info':
    default: return 'ℹ';
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Dismiss a specific toast by clicking
export function handleToastClick(x: number, y: number, canvas: HTMLCanvasElement, game: any): boolean {
  const rightEdge = canvas.width - game.scale(20);
  let yOffset = game.scale(100);
  
  for (const toast of toasts) {
    const width = game.scale(TOAST_WIDTH);
    const height = game.scale(TOAST_HEIGHT);
    const slideOffset = (1 - easeOutCubic(toast.animationProgress)) * width;
    const toastX = rightEdge - width + slideOffset;
    const toastY = yOffset;
    
    if (x >= toastX && x <= toastX + width &&
        y >= toastY && y <= toastY + height) {
      toast.dismissed = true;
      return true;
    }
    
    yOffset += height + game.scale(TOAST_SPACING);
  }
  
  return false;
}
