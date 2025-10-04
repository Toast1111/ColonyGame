/**
 * Region System - RimWorld-style spatial partitioning for efficient pathfinding and object finding
 * 
 * Regions divide the map into connected areas where every cell can reach every other cell.
 * This enables:
 * - Fast nearest-object finding (search region-by-region instead of globally)
 * - Early pathfinding exit (detect unreachable destinations before expensive A*)
 * - Wall-aware behavior (don't path to objects behind walls)
 * - Future extensibility (different traversal rules for different entity types)
 */

import { T } from "../constants";
import type { Building } from "../types";

/**
 * A Link represents an edge between two regions (like a doorway or open border).
 * Links are hashed to enable fast neighbor lookup.
 */
export interface RegionLink {
  span: number;      // Length of the link (in tiles)
  edge: 0 | 1 | 2 | 3; // Which edge: 0=north, 1=east, 2=south, 3=west
  x: number;         // Grid coordinates of the link
  y: number;
}

/**
 * A Region is a contiguous area of passable tiles.
 * Stores objects within it and connections to neighboring regions.
 */
export interface Region {
  id: number;
  cells: Set<number>;           // Cell indices in this region (y * cols + x)
  neighbors: Set<number>;       // IDs of adjacent regions
  links: RegionLink[];          // Connection points to neighbors
  
  // Room/area properties
  roomId: number | null;        // Which room this region belongs to
  touchesMapEdge: boolean;      // Does this region touch the map boundary?
  
  // Cached data for performance
  objects: RegionObjectCache;   // Objects accessible from this region
  
  // Metadata
  valid: boolean;               // Is this region still valid (not deleted)?
  isExternal: boolean;          // Is this outside the main play area?
}

/**
 * Cached objects within a region for fast lookups
 */
export interface RegionObjectCache {
  buildings: Set<Building>;
  trees: Set<number>;           // Indices into game.trees array
  rocks: Set<number>;           // Indices into game.rocks array
  // Add more object types as needed (items, plants, etc.)
}

/**
 * A Room is a collection of regions that form a logical space
 * (e.g., a bedroom, a prison cell, an outdoor area)
 */
export interface Room {
  id: number;
  regions: Set<number>;         // Region IDs in this room
  
  // Room properties
  isPrison: boolean;
  isOutdoors: boolean;
  touchesMapEdge: boolean;
  
  // Future: temperature, cleanliness, impressiveness, etc.
}

/**
 * Generate a hash for a region link to enable fast neighbor matching.
 * Two regions that share a border will generate matching hashes.
 */
export function hashLink(link: RegionLink): number {
  // Normalize the link so that both sides produce the same hash
  // For horizontal links (north/south edges), use x coordinate
  // For vertical links (east/west edges), use y coordinate
  
  let hash = 0;
  
  if (link.edge === 0 || link.edge === 2) {
    // Horizontal link (north or south edge)
    // Two regions sharing this link will have the same x and span
    // but different y (one above, one below)
    hash = link.x * 100000 + link.span * 10 + (link.edge === 0 ? 0 : 2);
  } else {
    // Vertical link (east or west edge)
    hash = link.y * 100000 + link.span * 10 + (link.edge === 1 ? 1 : 3);
  }
  
  return hash;
}

/**
 * Check if two links should be connected (opposite edges, same position)
 */
export function linksMatch(a: RegionLink, b: RegionLink): boolean {
  // Links must be on opposite edges
  const opposites: Record<number, number> = { 0: 2, 1: 3, 2: 0, 3: 1 };
  if (opposites[a.edge] !== b.edge) return false;
  
  // Must have same span
  if (a.span !== b.span) return false;
  
  // Must align positionally
  if (a.edge === 0 || a.edge === 2) {
    // Horizontal: same x, adjacent y
    return a.x === b.x && Math.abs(a.y - b.y) === 1;
  } else {
    // Vertical: same y, adjacent x
    return a.y === b.y && Math.abs(a.x - b.x) === 1;
  }
}

/**
 * Calculate the grid index for a tile
 */
export function gridIndex(x: number, y: number, cols: number): number {
  return y * cols + x;
}

/**
 * Check if a grid position is within bounds
 */
export function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

/**
 * Check if a position touches the map edge
 */
export function touchesEdge(x: number, y: number, cols: number, rows: number): boolean {
  return x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
}

/**
 * Get neighboring grid positions (4-directional)
 */
export function getNeighbors4(x: number, y: number): Array<{ x: number; y: number; edge: 0 | 1 | 2 | 3 }> {
  return [
    { x, y: y - 1, edge: 0 }, // North
    { x: x + 1, y, edge: 1 }, // East
    { x, y: y + 1, edge: 2 }, // South
    { x: x - 1, y, edge: 3 }, // West
  ];
}

/**
 * Create an empty region
 */
export function createRegion(id: number): Region {
  return {
    id,
    cells: new Set(),
    neighbors: new Set(),
    links: [],
    roomId: null,
    touchesMapEdge: false,
    objects: {
      buildings: new Set(),
      trees: new Set(),
      rocks: new Set(),
    },
    valid: true,
    isExternal: false,
  };
}

/**
 * Create an empty room
 */
export function createRoom(id: number): Room {
  return {
    id,
    regions: new Set(),
    isPrison: false,
    isOutdoors: true,
    touchesMapEdge: false,
  };
}
