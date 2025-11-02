import type { Vec2 } from "../../core/utils";
import { T } from "../constants";

export interface TreePlantingSpot {
  x: number;
  y: number;
  plantedAt: number; // Timestamp when planted
  growthStage: 'empty' | 'sapling' | 'young' | 'mature'; // Growth stages
  treeType: 'oak' | 'pine' | 'birch'; // Future: different tree types
}

export interface TreeGrowingZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spots: TreePlantingSpot[];
  priority: number;
  settings: {
    autoPlant: boolean;
    treeType: 'oak' | 'pine' | 'birch';
    allowHarvest: boolean;
  };
}

export class TreeGrowingManager {
  private zones: TreeGrowingZone[] = [];
  private nextId = 1;

  createZone(x: number, y: number, width: number, height: number, name?: string): TreeGrowingZone {
    // Calculate planting spots on grid
    const spots: TreePlantingSpot[] = [];
    const gridSize = T; // Use tile size for spacing
    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        spots.push({
          x: x + col * gridSize + gridSize / 2,
          y: y + row * gridSize + gridSize / 2,
          plantedAt: 0,
          growthStage: 'empty',
          treeType: 'oak'
        });
      }
    }

    const zone: TreeGrowingZone = {
      id: `tree_zone_${this.nextId++}`,
      name: name || `Tree Zone ${this.nextId - 1}`,
      x,
      y,
      width,
      height,
      spots,
      priority: 1,
      settings: {
        autoPlant: true,
        treeType: 'oak',
        allowHarvest: true
      }
    };

    this.zones.push(zone);
    return zone;
  }

  removeZone(zoneId: string): boolean {
    const index = this.zones.findIndex(zone => zone.id === zoneId);
    if (index !== -1) {
      this.zones.splice(index, 1);
      return true;
    }
    return false;
  }

  getZone(zoneId: string): TreeGrowingZone | undefined {
    return this.zones.find(zone => zone.id === zoneId);
  }

  getAllZones(): TreeGrowingZone[] {
    return [...this.zones];
  }

  getZoneAtPosition(position: Vec2): TreeGrowingZone | null {
    for (const zone of this.zones) {
      if (this.isPositionInZone(position, zone)) {
        return zone;
      }
    }
    return null;
  }

  private isPositionInZone(position: Vec2, zone: TreeGrowingZone): boolean {
    return position.x >= zone.x && 
           position.x <= zone.x + zone.width &&
           position.y >= zone.y && 
           position.y <= zone.y + zone.height;
  }

  // Find empty spots that need planting
  findEmptySpots(zoneId?: string): Array<{ zone: TreeGrowingZone; spot: TreePlantingSpot }> {
    const result: Array<{ zone: TreeGrowingZone; spot: TreePlantingSpot }> = [];
    const zones = zoneId ? [this.getZone(zoneId)].filter((z): z is TreeGrowingZone => z !== undefined) : this.zones;

    for (const zone of zones) {
      if (!zone.settings.autoPlant) continue;
      
      for (const spot of zone.spots) {
        if (spot.growthStage === 'empty') {
          result.push({ zone, spot });
        }
      }
    }

    return result;
  }

  // Find mature trees ready for harvest
  findHarvestableSpots(zoneId?: string): Array<{ zone: TreeGrowingZone; spot: TreePlantingSpot }> {
    const result: Array<{ zone: TreeGrowingZone; spot: TreePlantingSpot }> = [];
    const zones = zoneId ? [this.getZone(zoneId)].filter((z): z is TreeGrowingZone => z !== undefined) : this.zones;

    for (const zone of zones) {
      if (!zone.settings.allowHarvest) continue;
      
      for (const spot of zone.spots) {
        if (spot.growthStage === 'mature') {
          result.push({ zone, spot });
        }
      }
    }

    return result;
  }

  // Plant a tree at a specific spot
  plantTree(zoneId: string, spotIndex: number, currentTime: number): boolean {
    const zone = this.getZone(zoneId);
    if (!zone || spotIndex < 0 || spotIndex >= zone.spots.length) return false;

    const spot = zone.spots[spotIndex];
    if (spot.growthStage !== 'empty') return false;

    spot.plantedAt = currentTime;
    spot.growthStage = 'sapling';
    spot.treeType = zone.settings.treeType;
    return true;
  }

  // Harvest a mature tree
  harvestTree(zoneId: string, spotIndex: number): { wood: number; seeds: number } | null {
    const zone = this.getZone(zoneId);
    if (!zone || spotIndex < 0 || spotIndex >= zone.spots.length) return null;

    const spot = zone.spots[spotIndex];
    if (spot.growthStage !== 'mature') return null;

    // Reset spot to empty for replanting
    spot.plantedAt = 0;
    spot.growthStage = 'empty';

    // Return wood yield (mature trees give more wood than wild trees)
    return { wood: 12, seeds: 2 }; // Higher yield than wild trees (8 wood)
  }

  // Update tree growth (called periodically)
  updateGrowth(currentTimeSeconds: number): void {
    for (const zone of this.zones) {
      for (const spot of zone.spots) {
        if (spot.growthStage === 'empty') continue;

        const ageInSeconds = currentTimeSeconds - spot.plantedAt;
        const ageInDays = ageInSeconds / (24 * 3600); // Convert to days

        // Growth stages: sapling (0-7 days) -> young (7-21 days) -> mature (21+ days)
        if (spot.growthStage === 'sapling' && ageInDays >= 7) {
          spot.growthStage = 'young';
        } else if (spot.growthStage === 'young' && ageInDays >= 21) {
          spot.growthStage = 'mature';
        }
      }
    }
  }

  // Find the closest empty planting spot to a position
  findClosestEmptySpot(position: Vec2): { zone: TreeGrowingZone; spot: TreePlantingSpot; spotIndex: number; distance: number } | null {
    let closest: { zone: TreeGrowingZone; spot: TreePlantingSpot; spotIndex: number; distance: number } | null = null;

    for (const zone of this.zones) {
      if (!zone.settings.autoPlant) continue;

      for (let i = 0; i < zone.spots.length; i++) {
        const spot = zone.spots[i];
        if (spot.growthStage !== 'empty') continue;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        if (!closest || distance < closest.distance) {
          closest = { zone, spot, spotIndex: i, distance };
        }
      }
    }

    return closest;
  }

  // Find the closest harvestable tree to a position
  findClosestHarvestableSpot(position: Vec2): { zone: TreeGrowingZone; spot: TreePlantingSpot; spotIndex: number; distance: number } | null {
    let closest: { zone: TreeGrowingZone; spot: TreePlantingSpot; spotIndex: number; distance: number } | null = null;

    for (const zone of this.zones) {
      if (!zone.settings.allowHarvest) continue;

      for (let i = 0; i < zone.spots.length; i++) {
        const spot = zone.spots[i];
        if (spot.growthStage !== 'mature') continue;

        const distance = Math.hypot(position.x - spot.x, position.y - spot.y);
        if (!closest || distance < closest.distance) {
          closest = { zone, spot, spotIndex: i, distance };
        }
      }
    }

    return closest;
  }

  // Update zone settings
  updateZoneSettings(zoneId: string, settings: Partial<TreeGrowingZone['settings']>): boolean {
    const zone = this.getZone(zoneId);
    if (!zone) return false;

    Object.assign(zone.settings, settings);
    return true;
  }

  // Convenience methods for FSM integration
  plantTreeAt(x: number, y: number, zoneId: string): boolean {
    const zone = this.getZone(zoneId);
    if (!zone) return false;

    // Find the closest empty spot to the given position
    let closestSpot: { spot: TreePlantingSpot; index: number } | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i < zone.spots.length; i++) {
      const spot = zone.spots[i];
      if (spot.growthStage !== 'empty') continue;

      const distance = Math.hypot(spot.x - x, spot.y - y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpot = { spot, index: i };
      }
    }

    if (!closestSpot) return false;

    // Use current time in seconds
    const currentTime = Date.now() / 1000;
    return this.plantTree(zoneId, closestSpot.index, currentTime);
  }

  harvestTreeAt(x: number, y: number, zoneId: string): boolean {
    const zone = this.getZone(zoneId);
    if (!zone) return false;

    // Find the closest mature tree to the given position
    let closestSpot: { spot: TreePlantingSpot; index: number } | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i < zone.spots.length; i++) {
      const spot = zone.spots[i];
      if (spot.growthStage !== 'mature') continue;

      const distance = Math.hypot(spot.x - x, spot.y - y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSpot = { spot, index: i };
      }
    }

    if (!closestSpot) return false;

    const result = this.harvestTree(zoneId, closestSpot.index);
    return result !== null;
  }
}