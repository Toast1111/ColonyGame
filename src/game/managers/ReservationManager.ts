import { Building, Colonist } from '../types';
import { T } from '../constants';

/**
 * ReservationManager
 * 
 * Handles all resource and space reservation systems:
 * - Building construction crew limits
 * - Sleep spot reservations (beds/houses)
 * - Building occupancy tracking
 * - Resource assignment (trees, rocks, mountain tiles)
 * 
 * Extracted from Game.ts lines 1961-2067 as part of manager architecture refactor.
 */
export class ReservationManager {
  // Resource assignments
  private assignedTargets = new WeakSet<object>();
  private assignedTiles = new Set<string>(); // Mountain tile assignments by "gx,gy" key
  
  // Building reservations
  private buildReservations = new Map<Building, number>();
  private insideCounts = new Map<Building, number>();
  private sleepReservations = new Map<Building, Set<Colonist>>();

  /**
   * Get assigned targets WeakSet (for work givers to check availability)
   */
  getAssignedTargets(): WeakSet<object> {
    return this.assignedTargets;
  }

  /**
   * Get assigned mountain tiles Set (for work givers to check availability)
   */
  getAssignedTiles(): Set<string> {
    return this.assignedTiles;
  }

  /**
   * Get the number of colonists currently inside a building
   */
  getInsideCount(b: Building): number {
    return this.insideCounts.get(b) || 0;
  }

  /**
   * Get the maximum capacity of a building
   */
  getBuildingCapacity(b: Building): number {
    if (b.kind === 'hq') return 8; // generous lobby
    if (b.kind === 'house') return 3; // 3 slots per house
    if (typeof b.popCap === 'number') return b.popCap;
    return 1;
  }

  /**
   * Get the number of reserved sleep spots for a building
   */
  private getReservedSleepCount(b: Building, ignoreColonist?: Colonist): number {
    const reservations = this.sleepReservations.get(b);
    if (!reservations || reservations.size === 0) return 0;
    if (ignoreColonist && reservations.has(ignoreColonist)) {
      return Math.max(0, reservations.size - 1);
    }
    return reservations.size;
  }

  /**
   * Check if a building has available space
   */
  buildingHasSpace(b: Building, ignoreColonist?: Colonist): boolean {
    const cap = this.getBuildingCapacity(b);
    const cur = this.insideCounts.get(b) || 0;
    const reserved = this.getReservedSleepCount(b, ignoreColonist);
    return cur + reserved < cap;
  }

  /**
   * Reserve a sleep spot in a building for a colonist
   */
  reserveSleepSpot(c: Colonist, b: Building): boolean {
    if (!b.done) return false;
    if (c.reservedSleepFor === b) return true;
    if (c.reservedSleepFor && c.reservedSleepFor !== b) {
      this.releaseSleepReservation(c);
    }
    const cap = this.getBuildingCapacity(b);
    const inside = this.insideCounts.get(b) || 0;
    const reservations = this.sleepReservations.get(b) || new Set<Colonist>();
    if (inside + reservations.size >= cap) {
      return false;
    }
    reservations.add(c);
    this.sleepReservations.set(b, reservations);
    c.reservedSleepFor = b;
    return true;
  }

  /**
   * Release a colonist's sleep reservation
   */
  releaseSleepReservation(c: Colonist) {
    const b = c.reservedSleepFor;
    if (!b) return;
    const reservations = this.sleepReservations.get(b);
    if (reservations) {
      reservations.delete(c);
      if (reservations.size === 0) this.sleepReservations.delete(b);
    }
    c.reservedSleepFor = null;
  }

  /**
   * Enter a building (occupancy tracking)
   */
  enterBuilding(c: Colonist, b: Building, centerOfBuilding: { x: number; y: number }): boolean {
    if (!b.done) return false;
    if (!this.buildingHasSpace(b, c)) return false;
    this.insideCounts.set(b, (this.insideCounts.get(b) || 0) + 1);
    this.releaseSleepReservation(c);
    c.inside = b; 
    c.hideTimer = 0;
    if (b.kind === 'bed') {
      c.x = centerOfBuilding.x;
      c.y = centerOfBuilding.y;
      c.restingOn = b;
      // Align sprite to a horizontal pose while sleeping
      (c as any).sleepFacing = Math.PI / 2;
    } else {
      c.restingOn = null;
    }
    return true;
  }

  /**
   * Leave a building (occupancy tracking)
   */
  leaveBuilding(c: Colonist) {
    const b = c.inside;
    if (b) {
      const cur = (this.insideCounts.get(b) || 1) - 1;
      if (cur <= 0) this.insideCounts.delete(b); 
      else this.insideCounts.set(b, cur);
    }
    if (b && b.kind === 'bed') {
      c.restingOn = null;
      (c as any).sleepFacing = undefined;
    }
    c.inside = null; 
    c.hideTimer = 0;
  }

  /**
   * Get maximum crew size for a building construction
   */
  getMaxCrew(b: Building): number {
    // Simple heuristic: small builds 1, medium 2, large 3
    const areaTiles = (b.w / T) * (b.h / T);
    if (areaTiles <= 1) return 1;
    if (areaTiles <= 4) return 2;
    return 3;
  }

  /**
   * Reserve a build slot for construction work
   */
  reserveBuildSlot(c: Colonist, b: Building): boolean {
    if (c.reservedBuildFor === b) return true;
    const cur = this.buildReservations.get(b) || 0;
    const maxCrew = this.getMaxCrew(b);
    if (cur >= maxCrew) return false;
    this.buildReservations.set(b, cur + 1);
    c.reservedBuildFor = b;
    return true;
  }

  /**
   * Release a colonist's build reservation
   */
  releaseBuildReservation(c: Colonist) {
    if (!c.reservedBuildFor) return;
    const b = c.reservedBuildFor;
    const cur = (this.buildReservations.get(b) || 1) - 1;
    if (cur <= 0) this.buildReservations.delete(b);
    else this.buildReservations.set(b, cur);
    c.reservedBuildFor = null;
  }

  /**
   * Reserve a resource target (tree, rock)
   */
  reserveTarget(target: any): void {
    if (target && target.type && (target.type === 'tree' || target.type === 'rock')) {
      this.assignedTargets.add(target);
    }
  }

  /**
   * Release a resource target reservation
   */
  releaseTarget(target: any): void {
    if (target && target.type && this.assignedTargets.has(target)) {
      this.assignedTargets.delete(target);
    }
  }

  /**
   * Check if a resource target is already assigned
   */
  isTargetAssigned(target: any): boolean {
    return target && target.type && this.assignedTargets.has(target);
  }

  /**
   * Reserve a mountain tile for mining
   */
  reserveMountainTile(gx: number, gy: number): void {
    const tileKey = `${gx},${gy}`;
    this.assignedTiles.add(tileKey);
  }

  /**
   * Release a mountain tile reservation
   */
  releaseMountainTile(gx: number, gy: number): void {
    const tileKey = `${gx},${gy}`;
    this.assignedTiles.delete(tileKey);
  }

  /**
   * Check if a mountain tile is already assigned
   */
  isMountainTileAssigned(gx: number, gy: number): boolean {
    const tileKey = `${gx},${gy}`;
    return this.assignedTiles.has(tileKey);
  }

  /**
   * Clear all reservations for a specific building (when demolished)
   */
  clearBuildingReservations(b: Building) {
    this.buildReservations.delete(b);
    this.insideCounts.delete(b);
    this.sleepReservations.delete(b);
  }

  /**
   * Clear all reservations (for new game)
   */
  clearAll() {
    this.assignedTargets = new WeakSet<object>();
    this.assignedTiles.clear();
    this.buildReservations.clear();
    this.insideCounts.clear();
    this.sleepReservations.clear();
  }
}
