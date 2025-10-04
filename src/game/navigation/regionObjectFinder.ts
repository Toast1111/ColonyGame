/**
 * Region Object Finder - Efficient nearest-object finding using region-based search
 * 
 * Instead of checking all objects globally, this searches region-by-region:
 * 1. Check current region
 * 2. Check adjacent regions
 * 3. Expand to neighbors of neighbors, etc.
 * 
 * This is much faster and naturally respects walls/obstacles.
 */

import type { Region, Room } from "./regions";
import type { Building, Circle } from "../types";
import { T } from "../constants";

export interface ObjectSearchResult<T> {
  object: T;
  distance: number;
  region: Region;
}

/**
 * Find the nearest object of a given type, searching region-by-region
 */
export class RegionObjectFinder {
  private regions: Map<number, Region>;
  private rooms: Map<number, Room>;

  constructor(regions: Map<number, Region>, rooms: Map<number, Room>) {
    this.regions = regions;
    this.rooms = rooms;
  }

  /**
   * Find the nearest building matching a filter, starting from a position
   */
  findNearestBuilding(
    startRegionId: number,
    x: number,
    y: number,
    filter: (b: Building) => boolean,
    maxSearchDepth: number = 10
  ): ObjectSearchResult<Building> | null {
    const visited = new Set<number>();
    const queue: Array<{ regionId: number; depth: number }> = [{ regionId: startRegionId, depth: 0 }];
    
    let bestResult: ObjectSearchResult<Building> | null = null;
    let bestDist = Infinity;

    while (queue.length > 0) {
      const { regionId, depth } = queue.shift()!;
      
      if (visited.has(regionId)) continue;
      if (depth > maxSearchDepth) continue;
      visited.add(regionId);

      const region = this.regions.get(regionId);
      if (!region || !region.valid) continue;

      // Search buildings in this region
      for (const building of region.objects.buildings) {
        if (!filter(building)) continue;

        const centerX = building.x + building.w / 2;
        const centerY = building.y + building.h / 2;
        const dist = Math.hypot(x - centerX, y - centerY);

        if (dist < bestDist) {
          bestDist = dist;
          bestResult = { object: building, distance: dist, region };
        }
      }

      // If we found something in this region and it's closer than any neighbor could be,
      // we can stop early
      if (bestResult && depth > 0 && bestDist < this.estimateMinDistToNextRegion(region)) {
        break;
      }

      // Add neighbors to queue
      for (const neighborId of region.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ regionId: neighborId, depth: depth + 1 });
        }
      }
    }

    return bestResult;
  }

  /**
   * Find all buildings matching a filter within a certain region distance
   */
  findBuildingsInRange(
    startRegionId: number,
    x: number,
    y: number,
    maxDistance: number,
    filter: (b: Building) => boolean,
    maxSearchDepth: number = 10
  ): ObjectSearchResult<Building>[] {
    const results: ObjectSearchResult<Building>[] = [];
    const visited = new Set<number>();
    const queue: Array<{ regionId: number; depth: number }> = [{ regionId: startRegionId, depth: 0 }];

    while (queue.length > 0) {
      const { regionId, depth } = queue.shift()!;
      
      if (visited.has(regionId)) continue;
      if (depth > maxSearchDepth) continue;
      visited.add(regionId);

      const region = this.regions.get(regionId);
      if (!region || !region.valid) continue;

      // Search buildings in this region
      for (const building of region.objects.buildings) {
        if (!filter(building)) continue;

        const centerX = building.x + building.w / 2;
        const centerY = building.y + building.h / 2;
        const dist = Math.hypot(x - centerX, y - centerY);

        if (dist <= maxDistance) {
          results.push({ object: building, distance: dist, region });
        }
      }

      // Add neighbors to queue
      for (const neighborId of region.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ regionId: neighborId, depth: depth + 1 });
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find the nearest tree, searching region-by-region
   */
  findNearestTree(
    startRegionId: number,
    x: number,
    y: number,
    trees: Circle[],
    maxSearchDepth: number = 10
  ): ObjectSearchResult<Circle> | null {
    const visited = new Set<number>();
    const queue: Array<{ regionId: number; depth: number }> = [{ regionId: startRegionId, depth: 0 }];
    
    let bestResult: ObjectSearchResult<Circle> | null = null;
    let bestDist = Infinity;

    while (queue.length > 0) {
      const { regionId, depth } = queue.shift()!;
      
      if (visited.has(regionId)) continue;
      if (depth > maxSearchDepth) continue;
      visited.add(regionId);

      const region = this.regions.get(regionId);
      if (!region || !region.valid) continue;

      // Search trees in this region
      for (const treeIdx of region.objects.trees) {
        const tree = trees[treeIdx];
        if (!tree || tree.hp <= 0) continue;

        const dist = Math.hypot(x - tree.x, y - tree.y);

        if (dist < bestDist) {
          bestDist = dist;
          bestResult = { object: tree, distance: dist, region };
        }
      }

      // Early exit if we found something close
      if (bestResult && depth > 0 && bestDist < this.estimateMinDistToNextRegion(region)) {
        break;
      }

      // Add neighbors to queue
      for (const neighborId of region.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ regionId: neighborId, depth: depth + 1 });
        }
      }
    }

    return bestResult;
  }

  /**
   * Find the nearest rock, searching region-by-region
   */
  findNearestRock(
    startRegionId: number,
    x: number,
    y: number,
    rocks: Circle[],
    maxSearchDepth: number = 10
  ): ObjectSearchResult<Circle> | null {
    const visited = new Set<number>();
    const queue: Array<{ regionId: number; depth: number }> = [{ regionId: startRegionId, depth: 0 }];
    
    let bestResult: ObjectSearchResult<Circle> | null = null;
    let bestDist = Infinity;

    while (queue.length > 0) {
      const { regionId, depth } = queue.shift()!;
      
      if (visited.has(regionId)) continue;
      if (depth > maxSearchDepth) continue;
      visited.add(regionId);

      const region = this.regions.get(regionId);
      if (!region || !region.valid) continue;

      // Search rocks in this region
      for (const rockIdx of region.objects.rocks) {
        const rock = rocks[rockIdx];
        if (!rock || rock.hp <= 0) continue;

        const dist = Math.hypot(x - rock.x, y - rock.y);

        if (dist < bestDist) {
          bestDist = dist;
          bestResult = { object: rock, distance: dist, region };
        }
      }

      // Early exit if we found something close
      if (bestResult && depth > 0 && bestDist < this.estimateMinDistToNextRegion(region)) {
        break;
      }

      // Add neighbors to queue
      for (const neighborId of region.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ regionId: neighborId, depth: depth + 1 });
        }
      }
    }

    return bestResult;
  }

  /**
   * Check if two positions are in the same room (reachable without going through doors)
   */
  inSameRoom(regionId1: number, regionId2: number): boolean {
    const region1 = this.regions.get(regionId1);
    const region2 = this.regions.get(regionId2);
    
    if (!region1 || !region2) return false;
    if (region1.roomId === null || region2.roomId === null) return false;
    
    return region1.roomId === region2.roomId;
  }

  /**
   * Check if a position is reachable from another position
   * (they share a region or connected regions)
   */
  isReachable(fromRegionId: number, toRegionId: number, maxSearchDepth: number = 50): boolean {
    if (fromRegionId === toRegionId) return true;

    const visited = new Set<number>();
    const queue: Array<{ regionId: number; depth: number }> = [{ regionId: fromRegionId, depth: 0 }];

    while (queue.length > 0) {
      const { regionId, depth } = queue.shift()!;
      
      if (regionId === toRegionId) return true;
      if (visited.has(regionId)) continue;
      if (depth > maxSearchDepth) continue;
      visited.add(regionId);

      const region = this.regions.get(regionId);
      if (!region || !region.valid) continue;

      for (const neighborId of region.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({ regionId: neighborId, depth: depth + 1 });
        }
      }
    }

    return false;
  }

  /**
   * Estimate minimum distance to reach the next region
   * (used for early exit optimization)
   */
  private estimateMinDistToNextRegion(region: Region): number {
    // Estimate: region size is roughly sqrt(cells) * tileSize
    // Distance to neighbor is at least half the region diameter
    const approxDiameter = Math.sqrt(region.cells.size) * T;
    return approxDiameter * 0.5;
  }

  /**
   * Get the room for a region
   */
  getRoomForRegion(regionId: number): Room | null {
    const region = this.regions.get(regionId);
    if (!region || region.roomId === null) return null;
    return this.rooms.get(region.roomId) || null;
  }
}
