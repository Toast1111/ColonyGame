/**
 * Pathfinding Worker
 * 
 * Dedicated worker for A* pathfinding computations.
 * Offloads expensive path calculations from the main thread.
 * 
 * Operations:
 * - computePath: Standard A* pathfinding
 * - computePathWithDangerAvoidance: Pathfinding that avoids dangerous areas
 * - computeMultiplePaths: Batch pathfinding for multiple entities
 */

import type { WorkerTask, WorkerResponse } from './WorkerPool';

// Grid data structure for pathfinding
interface GridData {
  cols: number;
  rows: number;
  solid: Uint8Array;
  cost: Float32Array;
  minCost: number;
}

// Path node structure
interface PathNode {
  x: number;
  y: number;
}

// Danger memory for colonist-aware pathfinding
interface DangerMemory {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
}

/**
 * A* pathfinding algorithm
 */
function computePathAStar(
  grid: GridData,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  dangerZones?: DangerMemory[]
): PathNode[] | null {
  const T = 32; // Tile size constant
  
  // Convert world coordinates to grid coordinates
  const startCol = Math.floor(startX / T);
  const startRow = Math.floor(startY / T);
  const targetCol = Math.floor(targetX / T);
  const targetRow = Math.floor(targetY / T);
  
  // Bounds check
  if (startCol < 0 || startRow < 0 || startCol >= grid.cols || startRow >= grid.rows) {
    return null;
  }
  if (targetCol < 0 || targetRow < 0 || targetCol >= grid.cols || targetRow >= grid.rows) {
    return null;
  }
  
  const startIdx = startRow * grid.cols + startCol;
  const targetIdx = targetRow * grid.cols + targetCol;
  
  // Check if target is blocked
  if (grid.solid[targetIdx]) {
    return null;
  }
  
  // Manhattan distance heuristic
  const heuristic = (col: number, row: number): number => {
    return (Math.abs(col - targetCol) + Math.abs(row - targetRow)) * grid.minCost;
  };
  
  // Check if position is in danger zone
  const isInDanger = (col: number, row: number): boolean => {
    if (!dangerZones || dangerZones.length === 0) return false;
    
    const worldX = col * T + T / 2;
    const worldY = row * T + T / 2;
    
    for (const danger of dangerZones) {
      const dx = worldX - danger.x;
      const dy = worldY - danger.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < danger.radius * danger.radius) {
        return true;
      }
    }
    return false;
  };
  
  // A* data structures
  const openSet = new Set<number>([startIdx]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[startIdx, 0]]);
  const fScore = new Map<number, number>([[startIdx, heuristic(startCol, startRow)]]);
  
  // Priority queue (simple implementation - find minimum f-score)
  const getLowestFScore = (): number | null => {
    let lowest = Infinity;
    let lowestIdx = null;
    for (const idx of openSet) {
      const f = fScore.get(idx) || Infinity;
      if (f < lowest) {
        lowest = f;
        lowestIdx = idx;
      }
    }
    return lowestIdx;
  };
  
  // Neighbors (4-directional)
  const getNeighbors = (idx: number): number[] => {
    const row = Math.floor(idx / grid.cols);
    const col = idx % grid.cols;
    const neighbors: number[] = [];
    
    // Up, Down, Left, Right
    if (row > 0) neighbors.push((row - 1) * grid.cols + col);
    if (row < grid.rows - 1) neighbors.push((row + 1) * grid.cols + col);
    if (col > 0) neighbors.push(row * grid.cols + (col - 1));
    if (col < grid.cols - 1) neighbors.push(row * grid.cols + (col + 1));
    
    return neighbors;
  };
  
  // A* main loop
  let iterations = 0;
  const maxIterations = grid.cols * grid.rows; // Prevent infinite loops
  
  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;
    
    const current = getLowestFScore();
    if (current === null) break;
    
    if (current === targetIdx) {
      // Reconstruct path
      const path: PathNode[] = [];
      let curr = current;
      
      while (cameFrom.has(curr)) {
        const row = Math.floor(curr / grid.cols);
        const col = curr % grid.cols;
        path.unshift({ x: col * T + T / 2, y: row * T + T / 2 });
        curr = cameFrom.get(curr)!;
      }
      
      return path;
    }
    
    openSet.delete(current);
    const currentRow = Math.floor(current / grid.cols);
    const currentCol = current % grid.cols;
    const currentG = gScore.get(current) || 0;
    
    for (const neighbor of getNeighbors(current)) {
      // Skip if blocked
      if (grid.solid[neighbor]) continue;
      
      const neighborRow = Math.floor(neighbor / grid.cols);
      const neighborCol = neighbor % grid.cols;
      
      // Apply danger zone penalty (but don't completely block)
      let moveCost = grid.cost[neighbor];
      if (isInDanger(neighborCol, neighborRow)) {
        moveCost *= 5; // 5x cost penalty for danger zones
      }
      
      const tentativeG = currentG + moveCost;
      const neighborG = gScore.get(neighbor) || Infinity;
      
      if (tentativeG < neighborG) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + heuristic(neighborCol, neighborRow));
        
        if (!openSet.has(neighbor)) {
          openSet.add(neighbor);
        }
      }
    }
  }
  
  // No path found
  return null;
}

/**
 * Message handler for pathfinding worker
 */
self.onmessage = (event: MessageEvent<WorkerTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    let result: any = null;
    
    switch (task.operation) {
      case 'computePath': {
        const { grid, startX, startY, targetX, targetY } = task.data;
        result = computePathAStar(grid, startX, startY, targetX, targetY);
        break;
      }
      
      case 'computePathWithDangerAvoidance': {
        const { grid, startX, startY, targetX, targetY, dangerZones } = task.data;
        result = computePathAStar(grid, startX, startY, targetX, targetY, dangerZones);
        break;
      }
      
      case 'computeMultiplePaths': {
        // Batch pathfinding for multiple entities
        const { grid, requests } = task.data;
        result = requests.map((req: any) => ({
          id: req.id,
          path: computePathAStar(grid, req.startX, req.startY, req.targetX, req.targetY, req.dangerZones)
        }));
        break;
      }
      
      default:
        throw new Error(`Unknown pathfinding operation: ${task.operation}`);
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
      error: error.message || 'Pathfinding computation failed'
    };
    
    self.postMessage(response);
  }
};

// Export empty object to make this a module
export {};
