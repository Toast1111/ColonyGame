/**
 * Research UI Panel - Unified Tree View
 * 
 * DOM-based research tree showing ALL categories at once.
 * Features category filters (toggleable), zoom/pan, and color-coding.
 */

import { Game } from '../../Game';
import type { ResearchManager } from '../../research/ResearchManager';
import { RESEARCH_TREE, CATEGORY_INFO, type ResearchNode, type ResearchCategory } from '../../research/researchDatabase';

const NODE_WIDTH = 200;  // Increased from 180 for better readability
const NODE_HEIGHT = 120;
const GRID_X = 260; // Horizontal spacing
const GRID_Y = 170; // Vertical spacing
const PADDING = 150; // Padding around the tree

export class ResearchUI {
  private researchManager: ResearchManager;
  private game: Game;
  private container: HTMLElement | null = null;
  private activeFilters: Set<ResearchCategory> = new Set(['basic', 'military', 'agriculture', 'industry', 'medicine', 'advanced']);
  private treeContainer: HTMLElement | null = null;
  private svg: SVGSVGElement | null = null;
  private zoom: number = 0.7; // Start zoomed out to see more

  constructor(researchManager: ResearchManager, game: Game) {
    this.researchManager = researchManager;
    this.game = game;
    this.container = this.createContainer();
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'research-panel';
    container.hidden = true;
    
    // Header
    const header = document.createElement('div');
    header.className = 'research-header';
    
    const title = document.createElement('h2');
    title.textContent = 'Research Tree';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'research-close-btn';
    closeBtn.onclick = () => this.hide();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Filter bar (replaces exclusive category tabs)
    const filterBar = this.createFilterBar();
    
    // Tree container (scrollable with nodes and SVG)
    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'research-tree-container';
    this.treeContainer.id = 'research-tree-container';
    
    // Wrapper for proper sizing (inside scrollable container)
    const wrapper = document.createElement('div');
    wrapper.className = 'research-tree-wrapper';
    wrapper.id = 'research-tree-wrapper';
    
    // SVG for connection lines
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('research-tree-svg');
    wrapper.appendChild(this.svg);
    
    this.treeContainer.appendChild(wrapper);
    
    // Progress bar at bottom
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'research-progress-container';
    
    const progressHeader = document.createElement('div');
    progressHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    
    const progressInfo = document.createElement('div');
    progressInfo.className = 'research-progress-info';
    progressInfo.id = 'research-progress-info';
    progressInfo.style.margin = '0';
    progressInfo.textContent = 'No research in progress';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'research-cancel-btn';
    cancelBtn.className = 'research-cancel-btn';
    cancelBtn.textContent = '✕ Cancel';
    cancelBtn.style.display = 'none';
    cancelBtn.onclick = () => this.cancelResearch();
    
    progressHeader.appendChild(progressInfo);
    progressHeader.appendChild(cancelBtn);
    
    const progressBarOuter = document.createElement('div');
    progressBarOuter.className = 'research-progress-bar-outer';
    
    const progressBarInner = document.createElement('div');
    progressBarInner.id = 'research-progress-bar';
    progressBarInner.className = 'research-progress-bar-inner';
    
    const progressText = document.createElement('span');
    progressText.id = 'research-progress-text';
    progressText.textContent = '0%';
    
    progressBarInner.appendChild(progressText);
    progressBarOuter.appendChild(progressBarInner);
    progressBarContainer.appendChild(progressHeader);
    progressBarContainer.appendChild(progressBarOuter);
    
    container.appendChild(header);
    container.appendChild(filterBar);
    container.appendChild(this.treeContainer);
    container.appendChild(progressBarContainer);
    
    return container;
  }

  private createFilterBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'research-category-bar';
    bar.style.cssText = 'display:flex;gap:8px;padding:12px 16px;background:rgba(15,23,42,0.4);border-bottom:1px solid #334155;overflow-x:auto;flex-shrink:0;align-items:center;';
    
    // "Filters:" label
    const label = document.createElement('span');
    label.textContent = 'Show:';
    label.style.cssText = 'color:#94a3b8;font-weight:600;font-size:14px;margin-right:4px;';
    bar.appendChild(label);
    
    const categories = Object.keys(CATEGORY_INFO) as ResearchCategory[];
    
    categories.forEach(cat => {
      const info = CATEGORY_INFO[cat];
      const btn = document.createElement('button');
      
      // Count nodes in this category
      const count = Object.values(RESEARCH_TREE).filter(n => n.category === cat).length;
      btn.textContent = `${info.name} (${count})`;
      
      btn.className = 'research-category-btn';
      btn.style.borderColor = info.color;
      btn.style.color = info.color;
      btn.dataset.category = cat;
      
      // Start with all filters active
      if (this.activeFilters.has(cat)) {
        btn.classList.add('active');
        btn.style.background = `${info.color}33`; // 20% opacity
      } else {
        btn.style.background = 'rgba(30,41,59,0.5)';
      }
      
      btn.onclick = () => {
        // Toggle filter
        if (this.activeFilters.has(cat)) {
          this.activeFilters.delete(cat);
          btn.classList.remove('active');
          btn.style.background = 'rgba(30,41,59,0.5)';
        } else {
          this.activeFilters.add(cat);
          btn.classList.add('active');
          btn.style.background = `${info.color}33`;
        }
        this.refresh();
      };
      
      bar.appendChild(btn);
    });
    
    // "All" / "None" quick buttons
    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = 'research-category-btn';
    allBtn.style.cssText = 'background:#1e40af;border-color:#3b82f6;color:#3b82f6;margin-left:8px;';
    allBtn.onclick = () => {
      this.activeFilters = new Set(['basic', 'military', 'agriculture', 'industry', 'medicine', 'advanced']);
      this.refresh();
    };
    bar.appendChild(allBtn);
    
    const noneBtn = document.createElement('button');
    noneBtn.textContent = 'None';
    noneBtn.className = 'research-category-btn';
    noneBtn.style.cssText = 'background:rgba(30,41,59,0.5);border-color:#6b7280;color:#6b7280;';
    noneBtn.onclick = () => {
      this.activeFilters.clear();
      this.refresh();
    };
    bar.appendChild(noneBtn);
    
    return bar;
  }

  private renderResearchTree(): void {
    if (!this.treeContainer || !this.svg) return;
    
    const wrapper = document.getElementById('research-tree-wrapper');
    if (!wrapper) return;
    
    // Clear existing nodes and lines
    const existingNodes = wrapper.querySelectorAll('.research-node');
    existingNodes.forEach(node => node.remove());
    this.svg.innerHTML = '';
    
    // Get ALL research nodes (not filtered by category)
    const allNodes = Object.values(RESEARCH_TREE);
    
    if (allNodes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No research available.';
      empty.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:16px;';
      wrapper.appendChild(empty);
      return;
    }
    
    // Calculate tree dimensions
    const maxX = Math.max(...allNodes.map(n => n.position.x));
    const maxY = Math.max(...allNodes.map(n => n.position.y));
    const treeWidth = (maxX + 1) * GRID_X + PADDING * 2;
    const treeHeight = (maxY + 1) * GRID_Y + PADDING * 2;
    
    // Set wrapper and SVG size to match tree
    wrapper.style.width = `${treeWidth}px`;
    wrapper.style.height = `${treeHeight}px`;
    this.svg.setAttribute('width', treeWidth.toString());
    this.svg.setAttribute('height', treeHeight.toString());
    
    // Draw prerequisite connections (straight lines, rendered under nodes)
    const drawnConnections = new Set<string>();
    
    allNodes.forEach(node => {
      if (node.prerequisites.length > 0) {
        node.prerequisites.forEach(prereqId => {
          const connectionKey = `${prereqId}->${node.id}`;
          
          // Skip if already drawn
          if (drawnConnections.has(connectionKey)) return;
          drawnConnections.add(connectionKey);
          
          const prereqNode = RESEARCH_TREE[prereqId];
          if (prereqNode) {
            // Only draw if both nodes are visible (not filtered out)
            const fromVisible = this.activeFilters.has(prereqNode.category);
            const toVisible = this.activeFilters.has(node.category);
            
            if (fromVisible || toVisible) {
              this.drawConnection(prereqNode, node);
            }
          }
        });
      }
    });
    
    // Create node elements
    allNodes.forEach(node => {
      const nodeElement = this.createResearchNode(node);
      wrapper.appendChild(nodeElement);
    });
  }

  private drawConnection(fromNode: ResearchNode, toNode: ResearchNode): void {
    if (!this.svg) return;
    
    // Calculate positions: right center of fromNode, left center of toNode
    const x1 = fromNode.position.x * GRID_X + PADDING + NODE_WIDTH; // Right edge
    const y1 = fromNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2; // Center
    const x2 = toNode.position.x * GRID_X + PADDING; // Left edge
    const y2 = toNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2; // Center
    
    // Check if filtered
    const fromFiltered = !this.activeFilters.has(fromNode.category);
    const toFiltered = !this.activeFilters.has(toNode.category);
    
    // Line color - always white
    const color = '#ffffff';
    
    // Dim if either end is filtered
    let opacity = 0.6; // Base opacity for white lines (increased from 0.3)
    if (fromFiltered || toFiltered) {
      opacity = 0.1; // Very dim for filtered connections
    }
    
    // Create straight line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('fill', 'none');
    line.setAttribute('opacity', opacity.toString());
    
    this.svg.appendChild(line);
  }

  private createResearchNode(node: ResearchNode): HTMLElement {
    const div = document.createElement('div');
    div.className = 'research-node';
    div.dataset.researchId = node.id;
    
    // Position
    const x = node.position.x * GRID_X + PADDING;
    const y = node.position.y * GRID_Y + PADDING;
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${NODE_WIDTH}px`;
    
    // Color-code by category
    const categoryColor = CATEGORY_INFO[node.category].color;
    div.style.borderColor = categoryColor;
    // Don't override background - let CSS handle it (or the state classes will override)
    // The semi-transparent background was making lines visible through nodes
    
    // Determine research state
    const isCompleted = this.researchManager.isCompleted(node.id);
    const isAvailable = this.researchManager.isAvailable(node.id);
    const isInProgress = this.researchManager.isInProgress(node.id);
    
    // Apply state classes
    if (isCompleted) {
      div.classList.add('completed');
    } else if (isInProgress) {
      div.classList.add('in-progress');
    } else if (isAvailable) {
      div.classList.add('available');
    } else {
      // Locked - dim it
      div.style.opacity = '0.4';
      div.style.filter = 'grayscale(60%)';
    }
    
    // Dim if category is filtered out
    if (!this.activeFilters.has(node.category)) {
      div.style.opacity = '0.15';
      div.style.pointerEvents = 'none';
    }
    
    // Header with status icon
    const header = document.createElement('div');
    header.className = 'research-node-header';
    
    const statusIcon = document.createElement('span');
    statusIcon.className = 'research-node-status';
    if (isCompleted) {
      statusIcon.textContent = '✓';
      statusIcon.style.color = '#10b981';
    } else if (isInProgress) {
      statusIcon.textContent = '⏳';
      statusIcon.style.color = '#ea580c';
    } else if (isAvailable) {
      statusIcon.textContent = '●';
      statusIcon.style.color = '#3b82f6';
    } else {
      statusIcon.textContent = '🔒';
      statusIcon.style.color = '#6b7280';
    }
    
    const titleEl = document.createElement('div');
    titleEl.className = 'research-node-title';
    titleEl.textContent = node.name;
    
    header.appendChild(statusIcon);
    header.appendChild(titleEl);
    
    // Category badge
    const categoryBadge = document.createElement('div');
    categoryBadge.style.cssText = `font-size:9px;font-weight:700;color:${categoryColor};text-transform:uppercase;margin-bottom:4px;`;
    categoryBadge.textContent = CATEGORY_INFO[node.category].name;
    
    // Cost
    const costEl = document.createElement('div');
    costEl.className = 'research-node-cost';
    costEl.textContent = `${node.cost} pts • ${node.time}s`;
    
    // Description
    const descEl = document.createElement('div');
    descEl.className = 'research-node-desc';
    descEl.textContent = node.description;
    
    // Unlocks
    const unlocksEl = document.createElement('div');
    unlocksEl.className = 'research-node-unlocks';
    const unlocksList: string[] = [];
    if (node.unlocks.buildings) unlocksList.push(`🏗️ ${node.unlocks.buildings.length} buildings`);
    if (node.unlocks.items) unlocksList.push(`📦 ${node.unlocks.items.length} items`);
    if (node.unlocks.mechanics) unlocksList.push(`⚙️ ${node.unlocks.mechanics.length} mechanics`);
    unlocksEl.textContent = unlocksList.join(' • ');
    
    // Build node
    div.appendChild(header);
    div.appendChild(categoryBadge);
    div.appendChild(costEl);
    div.appendChild(descEl);
    if (unlocksList.length > 0) div.appendChild(unlocksEl);
    
    // Add tooltip and click handlers
    this.addNodeInteractivity(div, node, isAvailable, isCompleted, isInProgress);
    
    return div;
  }

  /**
   * Add tooltip hover and click interactions to research nodes
   */
  private addNodeInteractivity(
    div: HTMLElement,
    node: ResearchNode,
    isAvailable: boolean,
    isCompleted: boolean,
    isInProgress: boolean
  ): void {
    // Add tooltip on hover showing prerequisites
    div.addEventListener('mouseenter', (e) => this.showTooltip(e, node));
    div.addEventListener('mouseleave', () => this.hideTooltip());
    
    // Click handler
    if (isAvailable && !isCompleted && !isInProgress) {
      div.onclick = () => this.startResearch(node.id);
    } else if (!isAvailable && !isCompleted) {
      // Locked node - show popup on click
      div.style.cursor = 'pointer';
      div.onclick = () => this.showLockedPopup(node);
    }
  }

  /**
   * Show tooltip with prerequisite information
   */
  private showTooltip(event: MouseEvent, node: ResearchNode): void {
    // Remove any existing tooltip
    this.hideTooltip();
    
    // Only show tooltip if node has prerequisites
    if (node.prerequisites.length === 0) return;
    
    const tooltip = document.createElement('div');
    tooltip.id = 'research-tooltip';
    tooltip.className = 'research-tooltip';
    
    // Build prerequisite list
    const prereqsTitle = document.createElement('div');
    prereqsTitle.style.cssText = 'font-weight:700;margin-bottom:6px;color:#f1f5f9;';
    prereqsTitle.textContent = 'Prerequisites:';
    tooltip.appendChild(prereqsTitle);
    
    node.prerequisites.forEach(prereqId => {
      const prereqNode = RESEARCH_TREE[prereqId];
      if (prereqNode) {
        const prereqItem = document.createElement('div');
        const isCompleted = this.researchManager.isCompleted(prereqId);
        const categoryColor = CATEGORY_INFO[prereqNode.category].color;
        
        prereqItem.style.cssText = `
          display:flex;
          align-items:center;
          gap:6px;
          margin:4px 0;
          color:${isCompleted ? '#10b981' : '#cbd5e1'};
        `;
        
        const icon = document.createElement('span');
        icon.textContent = isCompleted ? '✓' : '○';
        icon.style.color = isCompleted ? '#10b981' : '#6b7280';
        
        const name = document.createElement('span');
        name.textContent = prereqNode.name;
        name.style.color = categoryColor;
        
        prereqItem.appendChild(icon);
        prereqItem.appendChild(name);
        tooltip.appendChild(prereqItem);
      }
    });
    
    // Position tooltip near the mouse
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 10}px`;
    tooltip.style.top = `${rect.top}px`;
    
    document.body.appendChild(tooltip);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const existing = document.getElementById('research-tooltip');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Show popup for locked nodes explaining missing prerequisites
   */
  private showLockedPopup(node: ResearchNode): void {
    // Remove any existing popup
    this.hideLockedPopup();
    
    const overlay = document.createElement('div');
    overlay.id = 'research-locked-overlay';
    overlay.style.cssText = `
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(0,0,0,0.7);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:10000;
    `;
    
    const popup = document.createElement('div');
    popup.className = 'research-locked-popup';
    popup.style.cssText = `
      background:#1e293b;
      border:2px solid #ef4444;
      border-radius:12px;
      padding:24px;
      max-width:400px;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
    `;
    
    // Title
    const title = document.createElement('div');
    title.style.cssText = 'font-size:18px;font-weight:700;color:#ef4444;margin-bottom:12px;display:flex;align-items:center;gap:8px;';
    title.innerHTML = '🔒 Research Locked';
    popup.appendChild(title);
    
    // Node name
    const nodeName = document.createElement('div');
    nodeName.style.cssText = 'font-size:16px;font-weight:600;color:#f1f5f9;margin-bottom:16px;';
    nodeName.textContent = node.name;
    popup.appendChild(nodeName);
    
    // Message
    const message = document.createElement('div');
    message.style.cssText = 'color:#cbd5e1;margin-bottom:16px;font-size:14px;';
    message.textContent = 'You must complete the following research first:';
    popup.appendChild(message);
    
    // Prerequisites list
    const prereqList = document.createElement('div');
    prereqList.style.cssText = 'margin-bottom:20px;';
    
    node.prerequisites.forEach(prereqId => {
      const prereqNode = RESEARCH_TREE[prereqId];
      if (prereqNode) {
        const isCompleted = this.researchManager.isCompleted(prereqId);
        const categoryColor = CATEGORY_INFO[prereqNode.category].color;
        
        const prereqItem = document.createElement('div');
        prereqItem.style.cssText = `
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          margin:6px 0;
          background:${isCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)'};
          border-left:3px solid ${isCompleted ? '#10b981' : categoryColor};
          border-radius:4px;
        `;
        
        const icon = document.createElement('span');
        icon.textContent = isCompleted ? '✓' : '○';
        icon.style.cssText = `font-size:16px;color:${isCompleted ? '#10b981' : '#6b7280'};`;
        
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;';
        
        const name = document.createElement('div');
        name.style.cssText = `font-weight:600;color:${categoryColor};font-size:14px;`;
        name.textContent = prereqNode.name;
        
        const cost = document.createElement('div');
        cost.style.cssText = 'font-size:12px;color:#94a3b8;margin-top:2px;';
        cost.textContent = `${prereqNode.cost} pts • ${prereqNode.time}s`;
        
        info.appendChild(name);
        info.appendChild(cost);
        prereqItem.appendChild(icon);
        prereqItem.appendChild(info);
        prereqList.appendChild(prereqItem);
      }
    });
    
    popup.appendChild(prereqList);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      width:100%;
      padding:10px;
      background:#3b82f6;
      border:none;
      border-radius:6px;
      color:white;
      font-weight:600;
      font-size:14px;
      cursor:pointer;
      transition:background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#2563eb';
    closeBtn.onmouseout = () => closeBtn.style.background = '#3b82f6';
    closeBtn.onclick = () => this.hideLockedPopup();
    
    popup.appendChild(closeBtn);
    overlay.appendChild(popup);
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.hideLockedPopup();
      }
    };
    
    document.body.appendChild(overlay);
  }

  /**
   * Hide locked popup
   */
  private hideLockedPopup(): void {
    const existing = document.getElementById('research-locked-overlay');
    if (existing) {
      existing.remove();
    }
  }

  private startResearch(researchId: string): void {
    this.researchManager.startResearch(researchId, Date.now());
    this.refresh();
  }

  private cancelResearch(): void {
    this.researchManager.cancelResearch();
    this.refresh();
  }

  public refresh(): void {
    this.renderResearchTree();
    this.updateProgressBar();
    this.updateFilterButtons();
  }

  private updateFilterButtons(): void {
    const buttons = this.container?.querySelectorAll('.research-category-btn[data-category]');
    buttons?.forEach(btn => {
      const category = (btn as HTMLElement).dataset.category as ResearchCategory;
      const info = CATEGORY_INFO[category];
      
      if (this.activeFilters.has(category)) {
        btn.classList.add('active');
        (btn as HTMLElement).style.background = `${info.color}33`;
      } else {
        btn.classList.remove('active');
        (btn as HTMLElement).style.background = 'rgba(30,41,59,0.5)';
      }
    });
  }

  private updateProgressBar(): void {
    const progressInfo = document.getElementById('research-progress-info');
    const progressBar = document.getElementById('research-progress-bar');
    const progressText = document.getElementById('research-progress-text');
    const cancelBtn = document.getElementById('research-cancel-btn');
    
    if (!progressInfo || !progressBar || !progressText || !cancelBtn) return;
    
    const current = this.researchManager.getCurrentResearch();
    if (!current) {
      progressInfo.textContent = 'No research in progress';
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      cancelBtn.style.display = 'none';
      return;
    }
    
    const node = RESEARCH_TREE[current.researchId];
    if (!node) return;
    
    const percentage = Math.floor(this.researchManager.getCurrentProgress());
    
    progressInfo.textContent = `Researching: ${node.name}`;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    cancelBtn.style.display = 'block';
  }

  public show(): void {
    if (this.container) {
      this.container.hidden = false;
      this.refresh();
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.hidden = true;
    }
  }

  public toggle(): void {
    if (this.container) {
      if (this.container.hidden) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  public isVisible(): boolean {
    return this.container ? !this.container.hidden : false;
  }
}
