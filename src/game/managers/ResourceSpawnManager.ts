/**
 * ResourceSpawnManager - Manages spawning and respawning of harvestable resources
 * 
 * Responsibilities:
 * - Initial resource scattering (trees, rocks)
 * - Periodic resource respawning
 * - Terrain-aware resource placement
 * - Pathfinding grid updates after spawning
 */

import { rand } from '../../core/utils';
import { T, WORLD, HQ_POS } from '../constants';
import { snapToTileCenter } from '../utils/tileAlignment';
import { getTerrainTypeFromId, TerrainType, type TerrainGrid } from '../terrain';
import type { Building } from '../types';

export interface ResourceNode {
  x: number;
  y: number;
  r: number;
  hp: number;
  type: 'tree' | 'rock';
}

export class ResourceSpawnManager {
  private respawnTimer = 0;
  
  /**
   * Scatter initial resources across the map
   * Avoids HQ area and mountain tiles
   */
  scatterResources(
    trees: ResourceNode[],
    rocks: ResourceNode[],
    terrainGrid: TerrainGrid,
    rebuildNavGrid: () => void
  ): void {
    // Beta feedback: Resources spawn closer to HQ for more convenient early game (120px = ~4 tiles)
    const isMountainPos = (x: number, y: number): boolean => {
      const gx = Math.floor(x / T);
      const gy = Math.floor(y / T);
      const terrainTypeId = terrainGrid.terrain[gy * terrainGrid.cols + gx];
      return getTerrainTypeFromId(terrainTypeId) === TerrainType.MOUNTAIN;
    };

    // Spawn trees
    for (let i = 0; i < 220; i++) { 
      const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; 
      if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 120) continue;
      if (isMountainPos(p.x, p.y)) continue; // Don't spawn on mountains
      
      // Snap tree to tile center for pathfinding alignment
      const alignedPos = snapToTileCenter(p.x, p.y);
      trees.push({ x: alignedPos.x, y: alignedPos.y, r: 12, hp: 40, type: 'tree' }); 
    }
    
    // Spawn rocks
    for (let i = 0; i < 140; i++) { 
      const p = { x: rand(80, WORLD.w - 80), y: rand(80, WORLD.h - 80) }; 
      if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 120) continue;
      if (isMountainPos(p.x, p.y)) continue; // Don't spawn on mountains
      
      // Snap rock to tile center for pathfinding alignment
      const alignedPos = snapToTileCenter(p.x, p.y);
      rocks.push({ x: alignedPos.x, y: alignedPos.y, r: 12, hp: 50, type: 'rock' }); 
    }
    
    // Rebuild navigation grid after scattering resources
    rebuildNavGrid();
  }
  
  /**
   * Try to respawn resources periodically
   * Maintains resource availability throughout the game
   */
  tryRespawn(
    dt: number,
    fastForward: number,
    trees: ResourceNode[],
    rocks: ResourceNode[],
    buildings: Building[],
    terrainGrid: TerrainGrid,
    rebuildNavGridPartial: (x: number, y: number, radius: number) => void
  ): void {
    this.respawnTimer += dt * fastForward;
    
    // Attempt every ~4 seconds
    if (this.respawnTimer >= 4) {
      this.respawnTimer = 0;
      
      // Helper to try spawning one resource
      const tryOne = (kind: 'tree' | 'rock') => {
        for (let k = 0; k < 6; k++) { // Few tries
          const p = { x: rand(60, WORLD.w - 60), y: rand(60, WORLD.h - 60) };
          
          // Beta feedback: Resources respawn closer to HQ (150px = ~5 tiles)
          if (Math.hypot(p.x - HQ_POS.x, p.y - HQ_POS.y) < 150) continue;
          
          // Avoid too close to buildings
          let ok = true;
          for (const b of buildings) { 
            if (p.x > b.x - 24 && p.x < b.x + b.w + 24 && 
                p.y > b.y - 24 && p.y < b.y + b.h + 24) { 
              ok = false; 
              break; 
            } 
          }
          if (!ok) continue;
          
          // Don't spawn on mountains
          const gx = Math.floor(p.x / T);
          const gy = Math.floor(p.y / T);
          const terrainTypeId = terrainGrid.terrain[gy * terrainGrid.cols + gx];
          if (getTerrainTypeFromId(terrainTypeId) === TerrainType.MOUNTAIN) continue;
          
          // Snap to tile center for pathfinding alignment
          const alignedPos = snapToTileCenter(p.x, p.y);
          
          if (kind === 'tree') {
            trees.push({ x: alignedPos.x, y: alignedPos.y, r: 12, hp: 40, type: 'tree' }); 
          } else {
            rocks.push({ x: alignedPos.x, y: alignedPos.y, r: 12, hp: 50, type: 'rock' });
          }
          
          // Use partial rebuild for new resource (only affects small area around spawn point)
          rebuildNavGridPartial(alignedPos.x, alignedPos.y, 12 + 32);
          break;
        }
      };
      
      // Spawn trees if below cap
      if (Math.random() < 0.5 && trees.length < 260) {
        tryOne('tree');
      }
      
      // Spawn rocks if below cap
      if (Math.random() < 0.35 && rocks.length < 180) {
        tryOne('rock');
      }
    }
  }
  
  /**
   * Reset respawn timer (for save/load)
   */
  resetTimer(): void {
    this.respawnTimer = 0;
  }
}
