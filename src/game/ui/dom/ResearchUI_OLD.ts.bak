/**
 * Research UI Panel - Visual Tree View
 * 
 * DOM-based research tree with nodes and connection lines.
 * Uses CSS classes from style.css for consistent styling.
 */

import { Game } from '../../Game';
import type { ResearchManager } from '../../research/ResearchManager';
import { RESEARCH_TREE, CATEGORY_INFO, type ResearchNode, type ResearchCategory } from '../../research/researchDatabase';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 120;
const GRID_X = 240; // Horizontal spacing between nodes
const GRID_Y = 160; // Vertical spacing between nodes
const PADDING = 100; // Padding around the tree

export class ResearchUI {
  private researchManager: ResearchManager;
  private game: Game;
  private container: HTMLElement | null = null;
  private selectedCategory: string = 'basic';
  private treeContainer: HTMLElement | null = null;
  private svg: SVGSVGElement | null = null;

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
    
    // Category bar
    const categoryBar = this.createCategoryBar();
    
    // Tree container (scrollable with nodes and SVG)
    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'research-tree-container';
    this.treeContainer.id = 'research-tree-container';
    
    // SVG for connection lines
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('research-tree-svg');
    this.treeContainer.appendChild(this.svg);
    
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
    container.appendChild(categoryBar);
    container.appendChild(this.treeContainer);
    container.appendChild(progressBarContainer);
    
    return container;
  }

  private createCategoryBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'research-category-bar';
    
    const categories = Object.keys(CATEGORY_INFO) as ResearchCategory[];
    
    categories.forEach(cat => {
      const info = CATEGORY_INFO[cat];
      const btn = document.createElement('button');
      btn.textContent = info.name;
      btn.className = 'research-category-btn';
      btn.style.borderColor = info.color;
      btn.style.color = info.color;
      
      if (cat === this.selectedCategory) {
        btn.classList.add('active');
      }
      
      btn.onclick = () => {
        this.selectedCategory = cat;
        this.refresh();
      };
      
      bar.appendChild(btn);
    });
    
    return bar;
  }

  private renderResearchTree(): void {
    if (!this.treeContainer || !this.svg) return;
    
    // Clear existing nodes and lines
    const existingNodes = this.treeContainer.querySelectorAll('.research-node');
    existingNodes.forEach(node => node.remove());
    this.svg.innerHTML = '';
    
    // Get research nodes in selected category
    const nodes = Object.values(RESEARCH_TREE)
      .filter(node => node.category === this.selectedCategory);
    
    if (nodes.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No research available in this category yet.';
      empty.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:16px;';
      this.treeContainer.appendChild(empty);
      return;
    }
    
    // Calculate tree dimensions
    const maxX = Math.max(...nodes.map(n => n.position.x));
    const maxY = Math.max(...nodes.map(n => n.position.y));
    const treeWidth = (maxX + 1) * GRID_X + PADDING * 2;
    const treeHeight = (maxY + 1) * GRID_Y + PADDING * 2;
    
    // Set SVG size to match tree
    this.svg.setAttribute('width', treeWidth.toString());
    this.svg.setAttribute('height', treeHeight.toString());
    
    // Draw connection lines first (so they appear behind nodes)
    nodes.forEach(node => {
      if (node.prerequisites.length > 0) {
        node.prerequisites.forEach(prereqId => {
          const prereqNode = RESEARCH_TREE[prereqId];
          if (prereqNode && prereqNode.category === this.selectedCategory) {
            this.drawConnection(prereqNode, node);
          }
        });
      }
    });
    
    // Create node elements
    nodes.forEach(node => {
      const nodeElement = this.createResearchNode(node);
      this.treeContainer!.appendChild(nodeElement);
    });
  }

  private drawConnection(fromNode: ResearchNode, toNode: ResearchNode): void {
    if (!this.svg) return;
    
    const x1 = fromNode.position.x * GRID_X + PADDING + NODE_WIDTH;
    const y1 = fromNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2;
    const x2 = toNode.position.x * GRID_X + PADDING;
    const y2 = toNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2;
    
    // Determine line color based on research state
    const fromCompleted = this.researchManager.isCompleted(fromNode.id);
    const toCompleted = this.researchManager.isCompleted(toNode.id);
    const toInProgress = this.researchManager.isInProgress(toNode.id);
    const toAvailable = this.researchManager.isAvailable(toNode.id);
    
    let strokeColor = '#475569'; // default (locked)
    let strokeWidth = 2;
    
    if (toCompleted) {
      strokeColor = '#10b981'; // green (completed path)
      strokeWidth = 3;
    } else if (toInProgress) {
      strokeColor = '#ea580c'; // orange (in progress)
      strokeWidth = 3;
    } else if (toAvailable && fromCompleted) {
      strokeColor = '#3b82f6'; // blue (available)
      strokeWidth = 2.5;
    }
    
    // Create curved path
    const midX = (x1 + x2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', strokeWidth.toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.7');
    
    this.svg!.appendChild(path);
  }

  private createResearchNode(node: ResearchNode): HTMLElement {
    const completed = this.researchManager.isCompleted(node.id);
    const available = this.researchManager.isAvailable(node.id);
    const inProgress = this.researchManager.isInProgress(node.id);
    
    const nodeElement = document.createElement('div');
    nodeElement.className = 'research-node';
    
    if (completed) nodeElement.classList.add('completed');
    else if (inProgress) nodeElement.classList.add('in-progress');
    else if (available) nodeElement.classList.add('available');
    
    // Position the node
    const x = node.position.x * GRID_X + PADDING;
    const y = node.position.y * GRID_Y + PADDING;
    nodeElement.style.left = `${x}px`;
    nodeElement.style.top = `${y}px`;
    
    if (available && !completed && !inProgress) {
      nodeElement.onclick = () => this.startResearch(node.id);
    }
    
    // Header
    const header = document.createElement('div');
    header.className = 'research-node-header';
    
    const status = document.createElement('span');
    status.className = 'research-node-status';
    status.textContent = completed ? '✓' : inProgress ? '⏳' : available ? '○' : '🔒';
    
    const title = document.createElement('span');
    title.className = 'research-node-title';
    title.textContent = node.name;
    
    header.appendChild(status);
    header.appendChild(title);
    nodeElement.appendChild(header);
    
    // Cost (with saved progress if any)
    const cost = document.createElement('div');
    cost.className = 'research-node-cost';
    const partialProgress = this.researchManager.getPartialProgress(node.id);
    if (partialProgress > 0 && !completed && !inProgress) {
      cost.textContent = `${node.cost} RP (${partialProgress.toFixed(0)} saved)`;
      cost.style.color = '#fbbf24'; // Amber color for saved progress
    } else {
      cost.textContent = `${node.cost} RP`;
    }
    nodeElement.appendChild(cost);
    
    // Description
    const desc = document.createElement('div');
    desc.className = 'research-node-desc';
    desc.textContent = node.description;
    nodeElement.appendChild(desc);
    
    // Unlocks (abbreviated)
    const unlocks: string[] = [];
    if (node.unlocks.buildings?.length) {
      unlocks.push(`🏗️ ${node.unlocks.buildings.length}`);
    }
    if (node.unlocks.items?.length) {
      unlocks.push(`⚔️ ${node.unlocks.items.length}`);
    }
    if (node.unlocks.mechanics?.length) {
      unlocks.push(`⚙️ ${node.unlocks.mechanics.length}`);
    }
    
    if (unlocks.length > 0) {
      const unlocksDiv = document.createElement('div');
      unlocksDiv.className = 'research-node-unlocks';
      unlocksDiv.textContent = `Unlocks: ${unlocks.join(' ')}`;
      nodeElement.appendChild(unlocksDiv);
    }
    
    // Progress bar for in-progress research
    if (inProgress) {
      const progress = this.researchManager.getCurrentProgress();
      const progressBar = document.createElement('div');
      progressBar.className = 'research-progress-bar-outer';
      progressBar.style.marginTop = '6px';
      
      const progressInner = document.createElement('div');
      progressInner.className = 'research-progress-bar-inner';
      progressInner.style.width = `${progress}%`;
      progressInner.style.fontSize = '10px';
      progressInner.textContent = `${Math.floor(progress)}%`;
      
      progressBar.appendChild(progressInner);
      nodeElement.appendChild(progressBar);
    }
    
    return nodeElement;
  }

  private startResearch(id: string): void {
    const currentTime = performance.now() / 1000;
    const success = this.researchManager.startResearch(id, currentTime);
    if (success) {
      void this.game.audioManager?.play('ui.click.primary').catch(() => {});
      const partialProgress = this.researchManager.getPartialProgress(id);
      if (partialProgress > 0) {
        this.game.msg?.(`Resumed research: ${RESEARCH_TREE[id].name}`, 'info');
      } else {
        this.game.msg?.(`Started research: ${RESEARCH_TREE[id].name}`, 'info');
      }
      this.refresh();
    } else {
      void this.game.audioManager?.play('ui.click.secondary').catch(() => {});
    }
  }

  private cancelResearch(): void {
    const success = this.researchManager.cancelResearch();
    if (success) {
      void this.game.audioManager?.play('ui.click.secondary').catch(() => {});
      this.game.msg?.('Research cancelled (progress saved)', 'info');
      this.refresh();
    }
  }

  /**
   * Refresh the UI display
   */
  refresh(): void {
    if (!this.container) return;
    
    // Update category buttons
    const categoryBar = this.container.querySelector('.research-category-bar');
    if (categoryBar) {
      categoryBar.querySelectorAll('.research-category-btn').forEach((btn, idx) => {
        const cat = Object.keys(CATEGORY_INFO)[idx];
        if (cat === this.selectedCategory) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
    
    // Render research tree for selected category
    this.renderResearchTree();
    
    // Update progress bar
    this.updateProgressBar();
  }

  private updateProgressBar(): void {
    const progressBar = document.getElementById('research-progress-bar');
    const progressText = document.getElementById('research-progress-text');
    const progressInfo = document.getElementById('research-progress-info');
    const cancelBtn = document.getElementById('research-cancel-btn');
    
    if (!progressBar || !progressText || !progressInfo || !cancelBtn) return;
    
    const current = this.researchManager.getCurrentResearch();
    
    if (current) {
      const progress = this.researchManager.getCurrentProgress();
      const node = RESEARCH_TREE[current.researchId];
      
      progressInfo.textContent = `Researching: ${node.name} (${current.progress.toFixed(0)} / ${node.cost} RP)`;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${Math.floor(progress)}%`;
      cancelBtn.style.display = 'block'; // Show cancel button
    } else {
      progressInfo.textContent = 'No research in progress';
      progressBar.style.width = '0%';
      progressText.textContent = '0%';
      cancelBtn.style.display = 'none'; // Hide cancel button
    }
  }

  /**
   * Show the research panel
   */
  show(): void {
    if (!this.container) return;
    this.container.hidden = false;
    this.refresh();
    void this.game.audioManager?.play('ui.panel.open').catch(() => {});
  }

  /**
   * Hide the research panel
   */
  hide(): void {
    if (!this.container) return;
    this.container.hidden = true;
    void this.game.audioManager?.play('ui.panel.close').catch(() => {});
  }

  /**
   * Toggle research panel visibility
   */
  toggle(): void {
    if (!this.container) return;
    if (this.container.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Check if panel is currently visible
   */
  isVisible(): boolean {
    return this.container ? !this.container.hidden : false;
  }
}
