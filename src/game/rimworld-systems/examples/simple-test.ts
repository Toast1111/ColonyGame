// Simple test/demo of the RimWorld system
// Run this in the browser console to test the system

import { RimWorldSystemManager } from '../rimWorldManager';

// Create a test canvas
const testCanvas = document.createElement('canvas');
testCanvas.width = 800;
testCanvas.height = 600;
document.body.appendChild(testCanvas);

// Initialize the system
const rimWorld = new RimWorldSystemManager({
  canvas: testCanvas,
  enableAutoHauling: true,
  defaultStockpileSize: 64,
  useEnhancedLogistics: true
});

// Create some test stockpile zones
const generalZone = rimWorld.createStockpileZone(100, 100, 128, 128, "General Storage");
const foodZone = rimWorld.createStockpileZone(300, 100, 96, 96, "Food Only");
rimWorld.updateStockpileItems(foodZone.id, ['food']);

// Drop some test items
rimWorld.dropItems('wood', 25, { x: 50, y: 50 });   // Outside stockpile
rimWorld.dropItems('food', 10, { x: 200, y: 200 }); // In general zone
rimWorld.dropItems('stone', 15, { x: 400, y: 300 }); // Outside any zone

console.log('Created zones:', rimWorld.stockpiles.getAllZones().length);
console.log('Created items:', rimWorld.floorItems.getAllItems().length);
console.log('Items needing hauling:', rimWorld.getItemsNeedingHauling().length);

// Test hauling job assignment
const haulingJob = rimWorld.assignHaulingJob('colonist_1', { x: 0, y: 0 });
console.log('Assigned hauling job:', haulingJob?.id);

// Render the system
rimWorld.render(0, 0);
rimWorld.renderDebugInfo(0, 0);

console.log('RimWorld system test complete! Check the canvas for visual output.');

export { rimWorld };
