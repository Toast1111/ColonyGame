/**
 * Work Priority Panel - RimWorld-style job assignment UI (React version)
 * 
 * Shows a grid of colonists × work types where each cell displays the priority (1-4 or disabled)
 * Click a cell to cycle through priorities
 */

import { useSyncExternalStore, useMemo, useState } from 'react';
import { subscribeWorkPriority, getWorkPriorityState, setWorkPriorityVisible } from '../stores/workPriorityStore';
import { WORK_TYPE_ORDER, WORK_TYPE_INFO, cycleWorkPriority, type WorkType, type WorkPriority } from '../../game/systems/workPriority';
import type { Colonist } from '../../game/types';

export function WorkPriorityPanel() {
  const state = useSyncExternalStore(subscribeWorkPriority, getWorkPriorityState, getWorkPriorityState);
  const [hoveredWorkType, setHoveredWorkType] = useState<WorkType | null>(null);

  const game = (window as any).game;
  const colonists = useMemo(() => {
    return (game?.state?.colonists || []).filter((c: Colonist) => c.alive);
  }, [game?.state?.colonists]);

  if (!state.visible || !colonists.length) {
    return null;
  }

  const handleClose = () => {
    setWorkPriorityVisible(false);
    game?.audioManager?.play('ui.panel.close');
    
    // Clear hotbar tab state
    if (game?.uiManager?.activeHotbarTab === 'work') {
      game.uiManager.setHotbarTab(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleCellClick = (colonist: Colonist, workType: WorkType) => {
    cycleWorkPriority(colonist, workType);
    game?.audioManager?.play('ui.click.primary');
  };

  const getPriorityClass = (priority: WorkPriority): string => {
    switch (priority) {
      case 1: return 'priority-1';
      case 2: return 'priority-2';
      case 3: return 'priority-3';
      case 4: return 'priority-4';
      case 0: return 'priority-disabled';
      default: return '';
    }
  };

  const getPriorityText = (priority: WorkPriority): string => {
    return priority === 0 ? '—' : priority.toString();
  };

  const getHealthColor = (colonist: Colonist): string => {
    const healthPercent = colonist.hp / 100;
    if (healthPercent > 0.66) return '#4caf50';
    if (healthPercent > 0.33) return '#ffc107';
    return '#f44336';
  };

  return (
    <div className="work-priority-overlay" onClick={handleBackdropClick}>
      <div className="work-priority-panel">
        <div className="work-priority-header">
          <h2>Work Priorities</h2>
          <button
            className="work-priority-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="work-priority-table-container">
          <table className="work-priority-table">
            <thead>
              <tr>
                <th className="colonist-name-header">Colonist</th>
                {WORK_TYPE_ORDER.map((workType) => {
                  const info = WORK_TYPE_INFO[workType];
                  const abbrev = info.label.substring(0, 4);
                  return (
                    <th
                      key={workType}
                      className="work-type-header"
                      onMouseEnter={() => setHoveredWorkType(workType)}
                      onMouseLeave={() => setHoveredWorkType(null)}
                      title={info.label}
                    >
                      {abbrev}
                      {hoveredWorkType === workType && (
                        <div className="work-type-tooltip">
                          {info.label}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {colonists.map((colonist: Colonist, index: number) => {
                const priorities = (colonist as any).workPriorities as Record<WorkType, WorkPriority> | undefined;
                return (
                  <tr key={colonist.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td className="colonist-name-cell">
                      <span className="colonist-name">{colonist.profile?.name || 'Unknown'}</span>
                      <span
                        className="health-indicator"
                        style={{ backgroundColor: getHealthColor(colonist) }}
                        title={`Health: ${Math.round(colonist.hp)}%`}
                      />
                    </td>
                    {WORK_TYPE_ORDER.map((workType) => {
                      const priority = priorities?.[workType] ?? 3;
                      return (
                        <td
                          key={workType}
                          className={`priority-cell ${getPriorityClass(priority)}`}
                          onClick={() => handleCellClick(colonist, workType)}
                          title={`${WORK_TYPE_INFO[workType].label}: ${priority === 0 ? 'Disabled' : `Priority ${priority}`}`}
                        >
                          {getPriorityText(priority)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="work-priority-footer">
          <p>Click a cell to cycle priority: 1 (highest) → 2 → 3 → 4 (lowest) → disabled → 1</p>
          <p>Press P to close • Hover over column headers for full names</p>
        </div>
      </div>
    </div>
  );
}
