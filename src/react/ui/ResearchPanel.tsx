import { useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { CATEGORY_INFO, RESEARCH_TREE, type ResearchCategory, type ResearchNode } from '../../game/research/researchDatabase';
import { getResearchPanelState, subscribeResearchPanel, setResearchPanelVisible } from '../stores/researchStore';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 120;
const GRID_X = 260;
const GRID_Y = 170;
const PADDING = 150;

const DEFAULT_FILTERS: ResearchCategory[] = ['basic', 'military', 'agriculture', 'industry', 'medicine', 'advanced'];

type TooltipState = {
  node: ResearchNode;
  x: number;
  y: number;
} | null;

type LockedPopupState = ResearchNode | null;

export function ResearchPanel() {
  const state = useSyncExternalStore(subscribeResearchPanel, getResearchPanelState, getResearchPanelState);
  const [activeFilters, setActiveFilters] = useState<Set<ResearchCategory>>(() => new Set(DEFAULT_FILTERS));
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [lockedPopup, setLockedPopup] = useState<LockedPopupState>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const game = (window as any).game;
  const researchManager = game?.researchManager;

  useEffect(() => {
    if (!state.visible) return;
    const interval = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [state.visible]);

  const categories = useMemo(() => Object.keys(CATEGORY_INFO) as ResearchCategory[], []);
  const nodes = useMemo(() => Object.values(RESEARCH_TREE), []);

  const treeSize = useMemo(() => {
    if (nodes.length === 0) {
      return { width: 0, height: 0 };
    }
    const maxX = Math.max(...nodes.map((node) => node.position.x));
    const maxY = Math.max(...nodes.map((node) => node.position.y));
    return {
      width: (maxX + 1) * GRID_X + PADDING * 2,
      height: (maxY + 1) * GRID_Y + PADDING * 2
    };
  }, [nodes, refreshTick]);

  if (!state.visible) {
    return null;
  }

  if (!researchManager) {
    return null;
  }

  const handleClose = () => {
    setResearchPanelVisible(false);
    try {
      game?.audioManager?.play('ui.panel.close');
    } catch {}

    if (game?.uiManager?.activeHotbarTab === 'research') {
      game.uiManager.setHotbarTab(null);
    }

    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
      mobileControls.style.display = '';
    }
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const toggleFilter = (category: ResearchCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const setAllFilters = () => {
    setActiveFilters(new Set(categories));
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
  };

  const handleNodeMouseEnter = (event: MouseEvent<HTMLDivElement>, node: ResearchNode) => {
    if (node.prerequisites.length === 0) {
      setTooltip(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({
      node,
      x: rect.right + 10,
      y: rect.top
    });
  };

  const handleNodeMouseLeave = () => {
    setTooltip(null);
  };

  const handleNodeClick = (node: ResearchNode, available: boolean, completed: boolean, inProgress: boolean) => {
    if (available && !completed && !inProgress) {
      researchManager.startResearch(node.id, Date.now());
      setRefreshTick((prev) => prev + 1);
      return;
    }

    if (!available && !completed) {
      setLockedPopup(node);
    }
  };

  const currentResearch = researchManager.getCurrentResearch();
  const currentNode = currentResearch ? RESEARCH_TREE[currentResearch.researchId] : null;
  const progressPercent = Math.floor(researchManager.getCurrentProgress());

  const lines = [] as Array<{ key: string; x1: number; y1: number; x2: number; y2: number; opacity: number }>;
  const drawn = new Set<string>();

  nodes.forEach((node) => {
    node.prerequisites.forEach((prereqId) => {
      const key = `${prereqId}->${node.id}`;
      if (drawn.has(key)) return;
      const prereqNode = RESEARCH_TREE[prereqId];
      if (!prereqNode) return;

      const fromVisible = activeFilters.has(prereqNode.category);
      const toVisible = activeFilters.has(node.category);
      if (!fromVisible && !toVisible) return;

      const fromFiltered = !fromVisible;
      const toFiltered = !toVisible;
      const opacity = fromFiltered || toFiltered ? 0.1 : 0.6;

      lines.push({
        key,
        x1: prereqNode.position.x * GRID_X + PADDING + NODE_WIDTH,
        y1: prereqNode.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2,
        x2: node.position.x * GRID_X + PADDING,
        y2: node.position.y * GRID_Y + PADDING + NODE_HEIGHT / 2,
        opacity
      });

      drawn.add(key);
    });
  });

  return (
    <div className="research-overlay" onMouseDown={handleBackdropClick}>
      <div id="research-panel">
        <div className="research-header">
          <h2>Research Tree</h2>
          <button className="research-close-btn" onClick={handleClose} type="button">✕</button>
        </div>

        <div className="research-category-bar">
          <span className="research-filter-label">Show:</span>
          {categories.map((category) => {
            const info = CATEGORY_INFO[category];
            const count = nodes.filter((node) => node.category === category).length;
            const isActive = activeFilters.has(category);

            return (
              <button
                key={category}
                type="button"
                className={`research-category-btn${isActive ? ' active' : ''}`}
                style={{
                  borderColor: info.color,
                  color: info.color,
                  background: isActive ? `${info.color}33` : 'rgba(30,41,59,0.5)'
                }}
                onClick={() => toggleFilter(category)}
              >
                {info.name} ({count})
              </button>
            );
          })}

          <button
            type="button"
            className="research-category-btn"
            style={{ background: '#1e40af', borderColor: '#3b82f6', color: '#3b82f6' }}
            onClick={setAllFilters}
          >
            All
          </button>
          <button
            type="button"
            className="research-category-btn"
            style={{ background: 'rgba(30,41,59,0.5)', borderColor: '#6b7280', color: '#6b7280' }}
            onClick={clearFilters}
          >
            None
          </button>
        </div>

        <div className="research-tree-container">
          <div
            className="research-tree-wrapper"
            style={{ width: `${treeSize.width}px`, height: `${treeSize.height}px` }}
          >
            <svg
              className="research-tree-svg"
              width={treeSize.width}
              height={treeSize.height}
            >
              {lines.map((line) => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#ffffff"
                  strokeWidth="2"
                  fill="none"
                  opacity={line.opacity}
                />
              ))}
            </svg>

            {nodes.map((node) => {
              const isCompleted = researchManager.isCompleted(node.id);
              const isAvailable = researchManager.isAvailable(node.id);
              const isInProgress = researchManager.isInProgress(node.id);
              const categoryColor = CATEGORY_INFO[node.category].color;
              const isFiltered = !activeFilters.has(node.category);

              const statusClass = isCompleted
                ? 'completed'
                : isInProgress
                  ? 'in-progress'
                  : isAvailable
                    ? 'available'
                    : '';

              const lockedStyle = !isCompleted && !isAvailable && !isInProgress
                ? { opacity: 0.4, filter: 'grayscale(60%)' }
                : {};

              const filteredStyle = isFiltered
                ? { opacity: 0.15, pointerEvents: 'none' as const }
                : {};

              const unlocksList: string[] = [];
              if (node.unlocks.buildings) unlocksList.push(`🏗️ ${node.unlocks.buildings.length} buildings`);
              if (node.unlocks.items) unlocksList.push(`📦 ${node.unlocks.items.length} items`);
              if (node.unlocks.mechanics) unlocksList.push(`⚙️ ${node.unlocks.mechanics.length} mechanics`);

              return (
                <div
                  key={node.id}
                  className={`research-node ${statusClass}`}
                  data-research-id={node.id}
                  style={{
                    left: `${node.position.x * GRID_X + PADDING}px`,
                    top: `${node.position.y * GRID_Y + PADDING}px`,
                    width: `${NODE_WIDTH}px`,
                    borderColor: categoryColor,
                    ...lockedStyle,
                    ...filteredStyle
                  }}
                  onMouseEnter={(event) => handleNodeMouseEnter(event, node)}
                  onMouseLeave={handleNodeMouseLeave}
                  onClick={() => handleNodeClick(node, isAvailable, isCompleted, isInProgress)}
                >
                  <div className="research-node-header">
                    <span className="research-node-status" style={{ color: isCompleted ? '#10b981' : isInProgress ? '#ea580c' : isAvailable ? '#3b82f6' : '#6b7280' }}>
                      {isCompleted ? '✓' : isInProgress ? '⏳' : isAvailable ? '●' : '🔒'}
                    </span>
                    <div className="research-node-title">{node.name}</div>
                  </div>
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: categoryColor,
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}
                  >
                    {CATEGORY_INFO[node.category].name}
                  </div>
                  <div className="research-node-cost">{node.cost} pts • {node.time}s</div>
                  <div className="research-node-desc">{node.description}</div>
                  {unlocksList.length > 0 && <div className="research-node-unlocks">{unlocksList.join(' • ')}</div>}
                </div>
              );
            })}

            {nodes.length === 0 && (
              <div className="research-tree-empty">No research available.</div>
            )}
          </div>
        </div>

        <div className="research-progress-container">
          <div className="research-progress-header">
            <div className="research-progress-info">
              {currentNode ? `Researching: ${currentNode.name}` : 'No research in progress'}
            </div>
            {currentNode && (
              <button
                id="research-cancel-btn"
                className="research-cancel-btn"
                type="button"
                onClick={() => {
                  researchManager.cancelResearch();
                  setRefreshTick((prev) => prev + 1);
                }}
              >
                ✕ Cancel
              </button>
            )}
          </div>
          <div className="research-progress-bar-outer">
            <div
              id="research-progress-bar"
              className="research-progress-bar-inner"
              style={{ width: `${currentNode ? progressPercent : 0}%` }}
            >
              <span id="research-progress-text">{currentNode ? `${progressPercent}%` : '0%'}</span>
            </div>
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="research-tooltip"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px', color: '#f1f5f9' }}>Prerequisites:</div>
          {tooltip.node.prerequisites.map((prereqId) => {
            const prereqNode = RESEARCH_TREE[prereqId];
            if (!prereqNode) return null;
            const completed = researchManager.isCompleted(prereqId);
            const categoryColor = CATEGORY_INFO[prereqNode.category].color;
            return (
              <div
                key={prereqId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '4px 0',
                  color: completed ? '#10b981' : '#cbd5e1'
                }}
              >
                <span style={{ color: completed ? '#10b981' : '#6b7280' }}>{completed ? '✓' : '○'}</span>
                <span style={{ color: categoryColor }}>{prereqNode.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {lockedPopup && (
        <div className="research-locked-overlay" onMouseDown={() => setLockedPopup(null)}>
          <div className="research-locked-popup" onMouseDown={(event) => event.stopPropagation()}>
            <div className="research-locked-title">🔒 Research Locked</div>
            <div className="research-locked-name">{lockedPopup.name}</div>
            <div className="research-locked-message">You must complete the following research first:</div>
            <div className="research-locked-list">
              {lockedPopup.prerequisites.map((prereqId) => {
                const prereqNode = RESEARCH_TREE[prereqId];
                if (!prereqNode) return null;
                const completed = researchManager.isCompleted(prereqId);
                const categoryColor = CATEGORY_INFO[prereqNode.category].color;
                return (
                  <div
                    key={prereqId}
                    className="research-locked-item"
                    style={{
                      borderLeftColor: completed ? '#10b981' : categoryColor,
                      background: completed ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)'
                    }}
                  >
                    <span className="research-locked-icon" style={{ color: completed ? '#10b981' : '#6b7280' }}>
                      {completed ? '✓' : '○'}
                    </span>
                    <div className="research-locked-info">
                      <div className="research-locked-prereq" style={{ color: categoryColor }}>{prereqNode.name}</div>
                      <div className="research-locked-cost">{prereqNode.cost} pts • {prereqNode.time}s</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="research-locked-close" type="button" onClick={() => setLockedPopup(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
