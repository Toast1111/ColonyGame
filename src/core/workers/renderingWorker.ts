/**
 * Rendering Worker
 * 
 * Dedicated worker for rendering preparation tasks.
 * Offloads computation-heavy render preparation from the main thread.
 * 
 * Operations:
 * - cullEntities: Determine which entities are visible in viewport
 * - sortEntitiesForRender: Sort entities by render order
 * - computeVisibleTiles: Calculate which grid tiles are in viewport
 * - prepareRenderBatch: Batch entity data for optimized rendering
 */

import type { WorkerTask, WorkerResponse } from './WorkerPool';

// Entity data for culling
interface Entity {
  x: number;
  y: number;
  r?: number; // Radius for circular entities
  w?: number; // Width for rectangular entities
  h?: number; // Height for rectangular entities
  id: string | number;
}

interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Cull entities outside viewport
 */
function cullEntities(entities: Entity[], viewport: ViewportBounds, padding: number = 100): (string | number)[] {
  const visibleIds: (string | number)[] = [];
  
  for (const entity of entities) {
    let inViewport = false;
    
    if (entity.r !== undefined) {
      // Circular entity
      inViewport = 
        entity.x + entity.r >= viewport.minX - padding &&
        entity.x - entity.r <= viewport.maxX + padding &&
        entity.y + entity.r >= viewport.minY - padding &&
        entity.y - entity.r <= viewport.maxY + padding;
    } else if (entity.w !== undefined && entity.h !== undefined) {
      // Rectangular entity
      inViewport = 
        entity.x + entity.w >= viewport.minX - padding &&
        entity.x <= viewport.maxX + padding &&
        entity.y + entity.h >= viewport.minY - padding &&
        entity.y <= viewport.maxY + padding;
    } else {
      // Point entity
      inViewport = 
        entity.x >= viewport.minX - padding &&
        entity.x <= viewport.maxX + padding &&
        entity.y >= viewport.minY - padding &&
        entity.y <= viewport.maxY + padding;
    }
    
    if (inViewport) {
      visibleIds.push(entity.id);
    }
  }
  
  return visibleIds;
}

/**
 * Sort entities by Y coordinate (for proper render layering)
 */
function sortEntitiesForRender(entities: Entity[]): (string | number)[] {
  return entities
    .sort((a, b) => a.y - b.y)
    .map(e => e.id);
}

/**
 * Compute visible grid tiles for a viewport
 */
function computeVisibleTiles(
  viewport: ViewportBounds,
  tileSize: number,
  gridCols: number,
  gridRows: number,
  padding: number = 2
): { startCol: number; endCol: number; startRow: number; endRow: number } {
  const startCol = Math.max(0, Math.floor((viewport.minX - padding * tileSize) / tileSize));
  const endCol = Math.min(gridCols, Math.ceil((viewport.maxX + padding * tileSize) / tileSize));
  const startRow = Math.max(0, Math.floor((viewport.minY - padding * tileSize) / tileSize));
  const endRow = Math.min(gridRows, Math.ceil((viewport.maxY + padding * tileSize) / tileSize));
  
  return { startCol, endCol, startRow, endRow };
}

/**
 * Prepare render batches for different entity types
 */
function prepareRenderBatch(
  entities: Entity[],
  viewport: ViewportBounds,
  batchSize: number = 100
): { batches: (string | number)[][]; totalVisible: number } {
  const visible = cullEntities(entities, viewport);
  const batches: (string | number)[][] = [];
  
  for (let i = 0; i < visible.length; i += batchSize) {
    batches.push(visible.slice(i, i + batchSize));
  }
  
  return { batches, totalVisible: visible.length };
}

/**
 * Calculate optimal render order for entities based on depth
 */
function calculateRenderOrder(entities: Entity[]): Map<string | number, number> {
  const renderOrder = new Map<string | number, number>();
  
  // Sort by Y coordinate (isometric-style depth sorting)
  const sorted = [...entities].sort((a, b) => {
    // Primary sort by Y
    if (Math.abs(a.y - b.y) > 1) {
      return a.y - b.y;
    }
    // Secondary sort by X for ties
    return a.x - b.x;
  });
  
  sorted.forEach((entity, index) => {
    renderOrder.set(entity.id, index);
  });
  
  return renderOrder;
}

/**
 * Message handler for rendering worker
 */
self.onmessage = (event: MessageEvent<WorkerTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    let result: any = null;
    
    switch (task.operation) {
      case 'cullEntities': {
        const { entities, viewport, padding } = task.data;
        result = cullEntities(entities, viewport, padding);
        break;
      }
      
      case 'sortEntitiesForRender': {
        const { entities } = task.data;
        result = sortEntitiesForRender(entities);
        break;
      }
      
      case 'computeVisibleTiles': {
        const { viewport, tileSize, gridCols, gridRows, padding } = task.data;
        result = computeVisibleTiles(viewport, tileSize, gridCols, gridRows, padding);
        break;
      }
      
      case 'prepareRenderBatch': {
        const { entities, viewport, batchSize } = task.data;
        result = prepareRenderBatch(entities, viewport, batchSize);
        break;
      }
      
      case 'calculateRenderOrder': {
        const { entities } = task.data;
        const orderMap = calculateRenderOrder(entities);
        // Convert Map to array of tuples for transfer
        result = Array.from(orderMap.entries());
        break;
      }
      
      default:
        throw new Error(`Unknown rendering operation: ${task.operation}`);
    }
    
    const executionTime = performance.now() - startTime;
    
    const response: WorkerResponse = {
      taskId: task.id,
      success: true,
      data: {
        result,
        executionTime
      }
    };
    
    self.postMessage(response);
  } catch (error: any) {
    const response: WorkerResponse = {
      taskId: task.id,
      success: false,
      error: error.message || 'Rendering computation failed'
    };
    
    self.postMessage(response);
  }
};

// Export empty object to make this a module
export {};
