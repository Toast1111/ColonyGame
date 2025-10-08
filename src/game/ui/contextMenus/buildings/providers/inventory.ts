/**
 * Building context menu provider for inventory actions
 */

import type { ContextMenuItem } from '../../types';
import { buildingContextMenuManager } from '../manager';
import { openBuildingInventoryPanel } from '../../../buildingInventoryPanel';

// Register inventory menu for all inventory-capable buildings
buildingContextMenuManager.register('*', ({ game, building }) => {
  // Only show for buildings with inventory
  if (!building.inventory || !building.done) return null;
  
  const items: ContextMenuItem<typeof building>[] = [];
  
  // View inventory option
  const itemCount = building.inventory.items.reduce((sum, item) => sum + item.quantity, 0);
  const slotsUsed = building.inventory.items.length;
  const slotsTotal = building.inventory.capacity;
  
  items.push({
    id: 'view_inventory',
    label: `View Inventory (${itemCount} items, ${slotsUsed}/${slotsTotal} slots)`,
    icon: '📦',
    enabled: true,
    action: ({ target }) => {
      openBuildingInventoryPanel(target);
    }
  });
  
  return items;
});
