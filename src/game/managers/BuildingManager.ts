/**
 * BuildingManager - Manages building-related operations and queries
 * 
 * Extracted from Game.ts lines 2050-3242 as part of the manager architecture refactor.
 * This manager handles building queries, space management, and building-related navigation.
 */

import type { Building, Colonist } from '../types';
import type { Game } from '../Game';
import { dist2 } from '../../core/utils';

export class BuildingManager {
  constructor(private game: Game) {}

  /**
   * Get the center point of a building
   */
  centerOf(building: Building): { x: number; y: number } {
    return { x: building.x + building.w / 2, y: building.y + building.h / 2 };
  }

  /**
   * Check if a building has space for a colonist
   * Delegates to ReservationManager for actual space checking
   */
  buildingHasSpace(building: Building, ignoreColonist?: Colonist): boolean {
    return this.game.reservationManager.buildingHasSpace(building, ignoreColonist);
  }

  /**
   * Check if a building is protected by turret coverage
   */
  isProtectedByTurret(building: Building): boolean {
    const bc = this.centerOf(building);
    for (const turret of this.game.buildings) {
      if (turret.kind !== 'turret' || !turret.done) continue;
      const range = (turret as any).range || 120;
      const tc = this.centerOf(turret);
      if (dist2(bc as any, tc as any) < range * range) return true;
    }
    return false;
  }

  /**
   * Find the best rest building for a colonist based on their medical needs
   */
  findBestRestBuilding(
    colonist: Colonist, 
    opts?: { requireMedical?: boolean; preferMedical?: boolean; allowShelterFallback?: boolean }
  ): Building | null {
    const { requireMedical = false, preferMedical = false, allowShelterFallback = true } = opts || {};
    const beds = this.game.buildings.filter((b) => 
      b.kind === 'bed' && b.done && this.buildingHasSpace(b, colonist)
    );
    const medicalBeds = beds.filter((b) => b.isMedicalBed);
    const standardBeds = beds.filter((b) => !b.isMedicalBed);

    const orderedBeds: Building[] = [];
    if (requireMedical) {
      orderedBeds.push(...medicalBeds);
    } else if (preferMedical && medicalBeds.length > 0) {
      orderedBeds.push(...medicalBeds, ...standardBeds);
    } else {
      orderedBeds.push(...standardBeds, ...medicalBeds);
    }

    const nearestFrom = (list: Building[]): Building | null => {
      let best: Building | null = null;
      let bestDist = Infinity;
      for (const b of list) {
        const c = this.centerOf(b);
        const d = Math.hypot(c.x - colonist.x, c.y - colonist.y);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      }
      return best;
    };

    const bed = nearestFrom(orderedBeds);
    if (bed) return bed;

    if (!allowShelterFallback) return null;

    const shelters = this.game.buildings.filter((b) =>
      (b.kind === 'house' || b.kind === 'tent' || b.kind === 'hq' || b.kind === 'infirmary') &&
      b.done &&
      this.buildingHasSpace(b, colonist)
    );

    return nearestFrom(shelters);
  }

  /**
   * Find buildings of specific types that are completed
   */
  findCompletedBuildings(kinds: string[]): Building[] {
    return this.game.buildings.filter(b => kinds.includes(b.kind) && b.done);
  }

  /**
   * Find the nearest building of a specific type to a colonist
   */
  findNearestBuilding(colonist: Colonist, kind: string): Building | null {
    let nearest: Building | null = null;
    let minDist = Infinity;

    for (const building of this.game.buildings) {
      if (building.kind === kind && building.done) {
        const center = this.centerOf(building);
        const dist = Math.hypot(colonist.x - center.x, colonist.y - center.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = building;
        }
      }
    }

    return nearest;
  }

  /**
   * Find all buildings with space for colonists
   */
  findAvailableBuildings(kinds: string[]): Building[] {
    return this.game.buildings.filter(b => 
      kinds.includes(b.kind) && b.done && this.buildingHasSpace(b)
    );
  }

  /**
   * Check if a point is inside a building
   */
  pointInBuilding(point: { x: number; y: number }, building: Building): boolean {
    return point.x >= building.x && 
           point.x <= building.x + building.w && 
           point.y >= building.y && 
           point.y <= building.y + building.h;
  }

  /**
   * Try to enter a building with a colonist (delegates to ReservationManager)
   */
  tryEnterBuilding(colonist: Colonist, building: Building): boolean {
    return this.game.reservationManager.enterBuilding(colonist, building, this.centerOf(building));
  }

  /**
   * Get storage buildings (warehouses, HQ, etc.)
   */
  getStorageBuildings(): Building[] {
    return this.game.buildings.filter(b => 
      (b.kind === 'warehouse' || b.kind === 'hq') && b.done
    );
  }

  /**
   * Get medical buildings (infirmary, medical beds)
   */
  getMedicalBuildings(): Building[] {
    return this.game.buildings.filter(b => 
      (b.kind === 'infirmary' || (b.kind === 'bed' && b.isMedicalBed)) && b.done
    );
  }
}