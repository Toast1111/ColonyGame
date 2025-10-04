/**
 * Region Builder - Constructs regions from the navigation grid using flood fill
 * 
 * This module handles:
 * - Building initial regions from scratch
 * - Incrementally updating regions when the map changes
 * - Detecting and creating region links
 * - Merging and splitting regions efficiently
 */

import type { Grid } from "../../core/pathfinding";
import type { Region, RegionLink, Room } from "./regions";
import { T } from "../constants";
import {
  createRegion,
  createRoom,
  gridIndex,
  inBounds,
  getNeighbors4,
  touchesEdge,
  hashLink,
  linksMatch,
} from "./regions";

/**
 * RegionGrid tracks which region each tile belongs to
 */
export class RegionGrid {
  regionIds: Int32Array; // -1 = solid/unpassable, >= 0 = region ID
  cols: number;
  rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.regionIds = new Int32Array(cols * rows).fill(-1);
  }

  get(x: number, y: number): number {
    if (!inBounds(x, y, this.cols, this.rows)) return -1;
    return this.regionIds[gridIndex(x, y, this.cols)];
  }

  set(x: number, y: number, regionId: number): void {
    if (inBounds(x, y, this.cols, this.rows)) {
      this.regionIds[gridIndex(x, y, this.cols)] = regionId;
    }
  }

  clear(): void {
    this.regionIds.fill(-1);
  }
}

/**
 * Builds regions from the navigation grid using flood fill
 */
export class RegionBuilder {
  private navGrid: Grid;
  private regionGrid: RegionGrid;
  private regions: Map<number, Region>;
  private rooms: Map<number, Room>;
  private nextRegionId: number;
  private nextRoomId: number;
  
  // Link hash index for fast neighbor lookup
  private linkHashIndex: Map<number, RegionLink & { regionId: number }>;
  
  // Door positions for special handling (doors create their own 1x1 regions)
  private doorPositions: Set<number>; // Grid indices of door tiles

  constructor(navGrid: Grid) {
    this.navGrid = navGrid;
    this.regionGrid = new RegionGrid(navGrid.cols, navGrid.rows);
    this.regions = new Map();
    this.rooms = new Map();
    this.nextRegionId = 0;
    this.nextRoomId = 0;
    this.linkHashIndex = new Map();
    this.doorPositions = new Set();
  }

  /**
   * Build all regions from scratch
   */
  buildAll(doors?: Array<{ x: number; y: number; w: number; h: number }>): void {
    console.log('[RegionBuilder] Building all regions...');
    const startTime = performance.now();
    
    this.clear();
    
    // Mark door positions for special handling
    if (doors) {
      for (const door of doors) {
        const gx = Math.floor(door.x / T);
        const gy = Math.floor(door.y / T);
        const idx = gridIndex(gx, gy, this.navGrid.cols);
        this.doorPositions.add(idx);
      }
    }
    
    // Create 1x1 regions for each door first
    for (const doorIdx of this.doorPositions) {
      const gx = doorIdx % this.navGrid.cols;
      const gy = Math.floor(doorIdx / this.navGrid.cols);
      
      // Skip if solid (shouldn't happen for doors)
      if (this.navGrid.solid[doorIdx] === 1) continue;
      
      // Create a single-cell region for this door
      const regionId = this.nextRegionId++;
      const region = createRegion(regionId);
      region.cells.add(doorIdx);
      this.regionGrid.set(gx, gy, regionId);
      
      // Check if door touches map edge
      if (touchesEdge(gx, gy, this.navGrid.cols, this.navGrid.rows)) {
        region.touchesMapEdge = true;
      }
      
      this.regions.set(regionId, region);
    }
    
    // Flood fill to create regions for non-door areas
    for (let y = 0; y < this.navGrid.rows; y++) {
      for (let x = 0; x < this.navGrid.cols; x++) {
        const idx = gridIndex(x, y, this.navGrid.cols);
        
        // Skip if already in a region or solid
        if (this.regionGrid.regionIds[idx] !== -1) continue;
        if (this.navGrid.solid[idx] === 1) continue;
        
        // Skip doors (already handled)
        if (this.doorPositions.has(idx)) continue;
        
        // Start a new region
        this.floodFillRegion(x, y);
      }
    }
    
    // Detect links between regions
    this.detectAllLinks();
    
    // Create rooms from regions
    this.buildRooms();
    
    const elapsed = performance.now() - startTime;
    console.log(`[RegionBuilder] Built ${this.regions.size} regions and ${this.rooms.size} rooms in ${elapsed.toFixed(2)}ms`);
  }

  /**
   * Rebuild regions in a specific area (for incremental updates)
   */
  rebuildArea(minX: number, minY: number, maxX: number, maxY: number, doors?: Array<{ x: number; y: number; w: number; h: number }>): void {
    console.log(`[RegionBuilder] Rebuilding area (${minX},${minY}) to (${maxX},${maxY})`);
    
    // Update door positions
    this.doorPositions.clear();
    if (doors) {
      for (const door of doors) {
        const gx = Math.floor(door.x / T);
        const gy = Math.floor(door.y / T);
        const idx = gridIndex(gx, gy, this.navGrid.cols);
        this.doorPositions.add(idx);
      }
    }
    
    // Find all regions that overlap this area
    const affectedRegions = new Set<number>();
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!inBounds(x, y, this.navGrid.cols, this.navGrid.rows)) continue;
        const regionId = this.regionGrid.get(x, y);
        if (regionId >= 0) {
          affectedRegions.add(regionId);
        }
      }
    }
    
    // Delete affected regions
    for (const regionId of affectedRegions) {
      this.deleteRegion(regionId);
    }
    
    // Create door regions first
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!inBounds(x, y, this.navGrid.cols, this.navGrid.rows)) continue;
        const idx = gridIndex(x, y, this.navGrid.cols);
        
        if (!this.doorPositions.has(idx)) continue;
        if (this.regionGrid.regionIds[idx] !== -1) continue;
        if (this.navGrid.solid[idx] === 1) continue;
        
        // Create single-cell door region
        const regionId = this.nextRegionId++;
        const region = createRegion(regionId);
        region.cells.add(idx);
        this.regionGrid.set(x, y, regionId);
        
        if (touchesEdge(x, y, this.navGrid.cols, this.navGrid.rows)) {
          region.touchesMapEdge = true;
        }
        
        this.regions.set(regionId, region);
      }
    }
    
    // Rebuild regions in this area
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!inBounds(x, y, this.navGrid.cols, this.navGrid.rows)) continue;
        const idx = gridIndex(x, y, this.navGrid.cols);
        
        if (this.regionGrid.regionIds[idx] !== -1) continue;
        if (this.navGrid.solid[idx] === 1) continue;
        if (this.doorPositions.has(idx)) continue;
        
        this.floodFillRegion(x, y);
      }
    }
    
    // Update links for regions adjacent to the rebuilt area
    this.detectLinksInArea(minX - 1, minY - 1, maxX + 1, maxY + 1);
    
    // Rebuild rooms
    this.buildRooms();
  }

  /**
   * Flood fill to create a single region
   * Stops at doors (which have their own 1x1 regions)
   */
  private floodFillRegion(startX: number, startY: number): void {
    const regionId = this.nextRegionId++;
    const region = createRegion(regionId);
    
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<number>();
    
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const idx = gridIndex(x, y, this.navGrid.cols);
      
      // Skip if already visited
      if (visited.has(idx)) continue;
      visited.add(idx);
      
      // Skip if out of bounds or solid
      if (!inBounds(x, y, this.navGrid.cols, this.navGrid.rows)) continue;
      if (this.navGrid.solid[idx] === 1) continue;
      
      // Skip if already assigned to a region
      if (this.regionGrid.regionIds[idx] >= 0) continue;
      
      // STOP at doors - they are separate regions
      if (this.doorPositions.has(idx)) continue;
      
      // Add to region
      region.cells.add(idx);
      this.regionGrid.set(x, y, regionId);
      
      // Check if touches map edge
      if (touchesEdge(x, y, this.navGrid.cols, this.navGrid.rows)) {
        region.touchesMapEdge = true;
      }
      
      // Add passable neighbors to queue (including adjacent to doors)
      for (const { x: nx, y: ny } of getNeighbors4(x, y)) {
        const nidx = gridIndex(nx, ny, this.navGrid.cols);
        if (!visited.has(nidx)) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
    
    // Only save regions with cells
    if (region.cells.size > 0) {
      this.regions.set(regionId, region);
    }
  }

  /**
   * Detect links between all regions
   */
  private detectAllLinks(): void {
    this.linkHashIndex.clear();
    
    for (const region of this.regions.values()) {
      this.detectLinksForRegion(region);
    }
  }

  /**
   * Detect links for a specific region
   */
  private detectLinksForRegion(region: Region): void {
    region.links = [];
    region.neighbors.clear();
    
    const edgeCells = this.findEdgeCells(region);
    const links = this.extractLinks(edgeCells, region.id);
    
    for (const link of links) {
      region.links.push(link);
      
      // Try to find matching link in hash index
      const hash = hashLink(link);
      const existing = this.linkHashIndex.get(hash);
      
      if (existing && existing.regionId !== region.id) {
        // Found a neighbor!
        region.neighbors.add(existing.regionId);
        const neighbor = this.regions.get(existing.regionId);
        if (neighbor) {
          neighbor.neighbors.add(region.id);
        }
      }
      
      // Add to hash index
      this.linkHashIndex.set(hash, { ...link, regionId: region.id });
    }
  }

  /**
   * Find cells on the edge of a region (adjacent to other regions or solid tiles)
   */
  private findEdgeCells(region: Region): Set<number> {
    const edgeCells = new Set<number>();
    
    for (const cellIdx of region.cells) {
      const x = cellIdx % this.navGrid.cols;
      const y = Math.floor(cellIdx / this.navGrid.cols);
      
      // Check if any neighbor is in a different region or solid
      for (const { x: nx, y: ny } of getNeighbors4(x, y)) {
        if (!inBounds(nx, ny, this.navGrid.cols, this.navGrid.rows)) {
          edgeCells.add(cellIdx);
          break;
        }
        
        const nidx = gridIndex(nx, ny, this.navGrid.cols);
        const nRegion = this.regionGrid.regionIds[nidx];
        
        if (nRegion !== region.id) {
          edgeCells.add(cellIdx);
          break;
        }
      }
    }
    
    return edgeCells;
  }

  /**
   * Extract continuous link segments from edge cells
   */
  private extractLinks(edgeCells: Set<number>, regionId: number): RegionLink[] {
    const links: RegionLink[] = [];
    const processed = new Set<number>();
    
    for (const cellIdx of edgeCells) {
      if (processed.has(cellIdx)) continue;
      
      const x = cellIdx % this.navGrid.cols;
      const y = Math.floor(cellIdx / this.navGrid.cols);
      
      // Check each edge direction
      for (const { x: nx, y: ny, edge } of getNeighbors4(x, y)) {
        if (!inBounds(nx, ny, this.navGrid.cols, this.navGrid.rows)) continue;
        
        const nidx = gridIndex(nx, ny, this.navGrid.cols);
        const nRegion = this.regionGrid.regionIds[nidx];
        
        // Only create links to passable cells in other regions
        if (nRegion === regionId) continue;
        if (this.navGrid.solid[nidx] === 1) continue;
        
        // Trace the link in this direction
        const link = this.traceLink(x, y, edge, edgeCells, processed);
        if (link) {
          links.push(link);
        }
      }
    }
    
    return links;
  }

  /**
   * Trace a continuous link segment
   */
  private traceLink(
    startX: number,
    startY: number,
    edge: 0 | 1 | 2 | 3,
    edgeCells: Set<number>,
    processed: Set<number>
  ): RegionLink | null {
    const link: RegionLink = {
      span: 0,
      edge,
      x: startX,
      y: startY,
    };
    
    // Determine tracing direction based on edge
    let dx = 0, dy = 0;
    if (edge === 0 || edge === 2) {
      // Horizontal link, trace along x
      dx = 1;
    } else {
      // Vertical link, trace along y
      dy = 1;
    }
    
    let x = startX, y = startY;
    while (true) {
      const idx = gridIndex(x, y, this.navGrid.cols);
      
      if (!edgeCells.has(idx)) break;
      
      // Check if this cell has an edge in the same direction
      const neighbors = getNeighbors4(x, y);
      const neighbor = neighbors.find(n => n.edge === edge);
      if (!neighbor) break;
      
      const nidx = gridIndex(neighbor.x, neighbor.y, this.navGrid.cols);
      if (!inBounds(neighbor.x, neighbor.y, this.navGrid.cols, this.navGrid.rows)) break;
      if (this.navGrid.solid[nidx] === 1) break;
      
      // Valid link cell
      link.span++;
      processed.add(idx);
      
      // Move to next cell
      x += dx;
      y += dy;
      
      if (!inBounds(x, y, this.navGrid.cols, this.navGrid.rows)) break;
    }
    
    return link.span > 0 ? link : null;
  }

  /**
   * Detect links in a specific area
   */
  private detectLinksInArea(minX: number, minY: number, maxX: number, maxY: number): void {
    const affectedRegions = new Set<number>();
    
    // Find regions in and around the area
    for (let y = Math.max(0, minY); y <= Math.min(this.navGrid.rows - 1, maxY); y++) {
      for (let x = Math.max(0, minX); x <= Math.min(this.navGrid.cols - 1, maxX); x++) {
        const regionId = this.regionGrid.get(x, y);
        if (regionId >= 0) {
          affectedRegions.add(regionId);
        }
      }
    }
    
    // Rebuild links for affected regions
    for (const regionId of affectedRegions) {
      const region = this.regions.get(regionId);
      if (region) {
        this.detectLinksForRegion(region);
      }
    }
  }

  /**
   * Build room structures from regions
   */
  private buildRooms(): void {
    this.rooms.clear();
    this.nextRoomId = 0;
    
    // Reset room assignments
    for (const region of this.regions.values()) {
      region.roomId = null;
    }
    
    // Flood fill to group connected regions into rooms
    const visited = new Set<number>();
    
    for (const region of this.regions.values()) {
      if (visited.has(region.id)) continue;
      
      const roomId = this.nextRoomId++;
      const room = createRoom(roomId);
      
      // BFS to find all connected regions
      const queue = [region.id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const current = this.regions.get(currentId);
        if (!current) continue;
        
        current.roomId = roomId;
        room.regions.add(currentId);
        
        if (current.touchesMapEdge) {
          room.touchesMapEdge = true;
        }
        
        // Add neighbors to queue
        for (const neighborId of current.neighbors) {
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
      
      this.rooms.set(roomId, room);
    }
  }

  /**
   * Delete a region and clean up references
   */
  private deleteRegion(regionId: number): void {
    const region = this.regions.get(regionId);
    if (!region) return;
    
    // Remove from region grid
    for (const cellIdx of region.cells) {
      this.regionGrid.regionIds[cellIdx] = -1;
    }
    
    // Remove from neighbors
    for (const neighborId of region.neighbors) {
      const neighbor = this.regions.get(neighborId);
      if (neighbor) {
        neighbor.neighbors.delete(regionId);
      }
    }
    
    // Remove links from hash index
    for (const link of region.links) {
      const hash = hashLink(link);
      this.linkHashIndex.delete(hash);
    }
    
    // Mark invalid and remove
    region.valid = false;
    this.regions.delete(regionId);
  }

  /**
   * Clear all regions
   */
  clear(): void {
    this.regions.clear();
    this.rooms.clear();
    this.regionGrid.clear();
    this.linkHashIndex.clear();
    this.doorPositions.clear();
    this.nextRegionId = 0;
    this.nextRoomId = 0;
  }

  // Getters
  getRegions(): Map<number, Region> { return this.regions; }
  getRooms(): Map<number, Room> { return this.rooms; }
  getRegionGrid(): RegionGrid { return this.regionGrid; }
  getRegionAt(x: number, y: number): Region | null {
    const id = this.regionGrid.get(x, y);
    return id >= 0 ? this.regions.get(id) || null : null;
  }
}
