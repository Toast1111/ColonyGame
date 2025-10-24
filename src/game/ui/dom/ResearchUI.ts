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
    
    // Only draw direct prerequisite connections (reduces spaghetti)
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
    
    const x1 = fromNode.position.x * GRID_X + PADDING + NODE_WIDTH;
    const y1 = fromNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2;
    const x2 = toNode.position.x * GRID_X + PADDING;
    const y2 = toNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2;
    
    // Determine line style
    const fromCompleted = this.researchManager.isCompleted(fromNode.id);
    const toCompleted = this.researchManager.isCompleted(toNode.id);
    const crossCategory = fromNode.category !== toNode.category;
    
    // Check if filtered
    const fromFiltered = !this.activeFilters.has(fromNode.category);
    const toFiltered = !this.activeFilters.has(toNode.category);
    
    // Line color
    let color = '#6b7280'; // Default gray
    if (fromCompleted && toCompleted) {
      color = '#10b981'; // Green for completed path
    } else if (fromCompleted) {
      color = '#3b82f6'; // Blue for available path
    }
    
    // Dim if either end is filtered
    let opacity = 0.4; // Lower base opacity
    if (fromFiltered || toFiltered) {
      opacity = 0.08; // Very dim for filtered connections
    }
    
    // Cross-category connections use dashed line and brighter color
    const strokeDasharray = crossCategory ? '6,3' : 'none';
    const strokeWidth = crossCategory ? '2.5' : '2';
    
    // Use path for smoother curves
    const midX = (x1 + x2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Bezier curve for smoother connections
    const pathData = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-dasharray', strokeDasharray);
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', opacity.toString());
    
    this.svg.appendChild(path);
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
    div.style.background = `${categoryColor}22`; // 13% opacity background
    
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
    
    // Click handler
    if (isAvailable && !isCompleted && !isInProgress) {
      div.onclick = () => this.startResearch(node.id);
    }
    
    return div;
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
