/**
 * Region Manager - Central coordinator for the region system
 * 
 * Responsibilities:
 * - Initialize and maintain region data structures
 * - Update regions when the map changes
 * - Populate region object caches
 * - Provide API for pathfinding and object finding
 */

import type { Grid } from "../../core/pathfinding";
import type { Building, Circle, Colonist } from "../types";
import type { Region, Room } from "./regions";
import { RegionBuilder } from "./regionBuilder";
import { RegionObjectFinder } from "./regionObjectFinder";
import { gridIndex, inBounds } from "./regions";
import { T } from "../constants";

export class RegionManager {
  private builder: RegionBuilder;
  private objectFinder: RegionObjectFinder;
  private navGrid: Grid;
  private enabled: boolean;

  constructor(navGrid: Grid) {
    this.navGrid = navGrid;
    this.builder = new RegionBuilder(navGrid);
    this.objectFinder = new RegionObjectFinder(
      this.builder.getRegions(),
      this.builder.getRooms()
    );
    this.enabled = false;
  }

  /**
   * Initialize the region system (call this after the game starts)
   */
  initialize(buildings?: Building[]): void {
    console.log('[RegionManager] Initializing region system...');
    const doors = buildings ? buildings.filter(b => b.kind === 'door' && b.done) : [];
    this.builder.buildAll(doors);
    this.enabled = true;
  }

  /**
   * Update regions when buildings change
   */
  onBuildingsChanged(buildings: Building[]): void {
    if (!this.enabled) return;

    // For now, just rebuild all regions
    // TODO: Optimize to only rebuild affected regions
    console.log('[RegionManager] Buildings changed, rebuilding regions...');
    const doors = buildings.filter(b => b.kind === 'door' && b.done);
    this.builder.buildAll(doors);
    this.updateObjectCaches(buildings, [], []);
  }

  /**
   * Update regions for a specific area (when something is built/destroyed)
   */
  updateArea(x: number, y: number, w: number, h: number, buildings?: Building[]): void {
    if (!this.enabled) return;

    const minX = Math.floor(x / T);
    const minY = Math.floor(y / T);
    const maxX = Math.floor((x + w) / T);
    const maxY = Math.floor((y + h) / T);

    const doors = buildings ? buildings.filter(b => b.kind === 'door' && b.done) : [];
    this.builder.rebuildArea(minX, minY, maxX, maxY, doors);
  }

  /**
   * Update object caches (call this periodically or when objects change)
   */
  updateObjectCaches(buildings: Building[], trees: Circle[], rocks: Circle[]): void {
    if (!this.enabled) return;

    const regions = this.builder.getRegions();
    const regionGrid = this.builder.getRegionGrid();

    // Clear all object caches
    for (const region of regions.values()) {
      region.objects.buildings.clear();
      region.objects.trees.clear();
      region.objects.rocks.clear();
    }

    // Add buildings to regions
    for (const building of buildings) {
      // Find regions that overlap this building
      const affectedRegions = new Set<number>();
      
      const minX = Math.floor(building.x / T);
      const minY = Math.floor(building.y / T);
      const maxX = Math.floor((building.x + building.w) / T);
      const maxY = Math.floor((building.y + building.h) / T);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const regionId = regionGrid.get(x, y);
          if (regionId >= 0) {
            affectedRegions.add(regionId);
          }
        }
      }

      // Add building to all overlapping regions
      for (const regionId of affectedRegions) {
        const region = regions.get(regionId);
        if (region) {
          region.objects.buildings.add(building);
        }
      }
    }

    // Add trees to regions
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      if (tree.hp <= 0) continue;

      const gridX = Math.floor(tree.x / T);
      const gridY = Math.floor(tree.y / T);
      const regionId = regionGrid.get(gridX, gridY);

      if (regionId >= 0) {
        const region = regions.get(regionId);
        if (region) {
          region.objects.trees.add(i);
        }
      }
    }

    // Add rocks to regions
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      if (rock.hp <= 0) continue;

      const gridX = Math.floor(rock.x / T);
      const gridY = Math.floor(rock.y / T);
      const regionId = regionGrid.get(gridX, gridY);

      if (regionId >= 0) {
        const region = regions.get(regionId);
        if (region) {
          region.objects.rocks.add(i);
        }
      }
    }
  }

  /**
   * Get the region ID at a world position
   */
  getRegionIdAt(x: number, y: number): number {
    const gridX = Math.floor(x / T);
    const gridY = Math.floor(y / T);
    return this.builder.getRegionGrid().get(gridX, gridY);
  }

  /**
   * Get the region at a world position
   */
  getRegionAt(x: number, y: number): Region | null {
    const gridX = Math.floor(x / T);
    const gridY = Math.floor(y / T);
    return this.builder.getRegionAt(gridX, gridY);
  }

  /**
   * Find nearest building using region-based search
   */
  findNearestBuilding(
    x: number,
    y: number,
    filter: (b: Building) => boolean
  ): Building | null {
    const regionId = this.getRegionIdAt(x, y);
    if (regionId < 0) return null;

    const result = this.objectFinder.findNearestBuilding(regionId, x, y, filter);
    return result ? result.object : null;
  }

  /**
   * Find nearest tree using region-based search
   */
  findNearestTree(x: number, y: number, trees: Circle[]): Circle | null {
    const regionId = this.getRegionIdAt(x, y);
    if (regionId < 0) return null;

    const result = this.objectFinder.findNearestTree(regionId, x, y, trees);
    return result ? result.object : null;
  }

  /**
   * Find nearest rock using region-based search
   */
  findNearestRock(x: number, y: number, rocks: Circle[]): Circle | null {
    const regionId = this.getRegionIdAt(x, y);
    if (regionId < 0) return null;

    const result = this.objectFinder.findNearestRock(regionId, x, y, rocks);
    return result ? result.object : null;
  }

  /**
   * Check if a destination is reachable from a start position
   */
  isReachable(startX: number, startY: number, endX: number, endY: number): boolean {
    const startRegionId = this.getRegionIdAt(startX, startY);
    const endRegionId = this.getRegionIdAt(endX, endY);

    if (startRegionId < 0 || endRegionId < 0) return false;

    return this.objectFinder.isReachable(startRegionId, endRegionId);
  }

  /**
   * Check if two positions are in the same room
   */
  inSameRoom(x1: number, y1: number, x2: number, y2: number): boolean {
    const region1Id = this.getRegionIdAt(x1, y1);
    const region2Id = this.getRegionIdAt(x2, y2);

    if (region1Id < 0 || region2Id < 0) return false;

    return this.objectFinder.inSameRoom(region1Id, region2Id);
  }

  /**
   * Get all regions (for debugging)
   */
  getRegions(): Map<number, Region> {
    return this.builder.getRegions();
  }

  /**
   * Get all rooms (for debugging)
   */
  getRooms(): Map<number, Room> {
    return this.builder.getRooms();
  }

  /**
   * Get statistics about the region system
   */
  getStats(): {
    regionCount: number;
    roomCount: number;
    avgRegionSize: number;
    avgRoomSize: number;
  } {
    const regions = this.builder.getRegions();
    const rooms = this.builder.getRooms();

    let totalCells = 0;
    for (const region of regions.values()) {
      totalCells += region.cells.size;
    }

    let totalRegionsInRooms = 0;
    for (const room of rooms.values()) {
      totalRegionsInRooms += room.regions.size;
    }

    return {
      regionCount: regions.size,
      roomCount: rooms.size,
      avgRegionSize: regions.size > 0 ? totalCells / regions.size : 0,
      avgRoomSize: rooms.size > 0 ? totalRegionsInRooms / rooms.size : 0,
    };
  }

  /**
   * Check if the region system is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable/disable the region system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.builder.getRegions().size === 0) {
      this.initialize();
    }
  }
}
