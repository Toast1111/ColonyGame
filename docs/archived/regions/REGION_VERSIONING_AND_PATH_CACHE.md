# Region Versioning and Path Cache System

## Overview

This document describes the region versioning and path caching infrastructure added to optimize pathfinding performance through intelligent caching with structural change detection.

## Problem Statement

Before this optimization:
- **Redundant path computation**: Identical paths (same start/end) recalculated every frame
- **No cache invalidation**: No way to detect when cached paths become invalid due to structural changes
- **Pathfinding storms**: 100+ colonists requesting paths simultaneously
- **Frame spikes**: Pathfinding taking 20-50ms on frames with many requests

## Solution Architecture

### 1. Region Versioning System (`src/core/RegionVersioning.ts`)

Tracks structural changes to regions for intelligent cache invalidation.

**Key Features:**
- **Version numbers per region**: Incremented on structural changes (buildings, walls, doors)
- **Snapshot validation**: Capture region versions at path computation time
- **Batch validation**: Check if multiple regions changed since snapshot
- **Dirty region tracking**: Track which regions need cache invalidation

**Usage:**
```typescript
// Mark region as changed (increments version)
regionVersionManager.markRegionChanged(regionId);

// Create snapshot for cache entry
const affectedRegions = [1, 2, 3];
const snapshot = regionVersionManager.createSnapshot(affectedRegions);

// Validate cache entry later
const isValid = regionVersionManager.validateSnapshot(snapshot);
```

### 2. Path Request Queue (`src/core/PathRequestQueue.ts`)

Centralized pathfinding queue with intelligent caching and backpressure.

**Key Features:**
- **Path caching**: Cache paths by start/end tile coordinates
- **Region version validation**: Invalidate cache when regions change
- **Per-pawn backpressure**: Max 1 outstanding request per entity
- **Priority queue**: Process critical requests first
- **Automatic cancellation**: Newer requests replace older ones
- **Tile-based cache keys**: Round coordinates to tiles for better hit rate

**Cache Entry Structure:**
```typescript
interface PathCacheEntry {
  path: any;                            // The computed path
  regionVersions: Map<number, number>;  // Version snapshot
  timestamp: number;                    // When cached
  hitCount: number;                     // How many cache hits
}
```

**Statistics Tracked:**
- Total requests, cache hits/misses
- Queue depth, active requests
- Cache size, average hits per entry
- Cache hit rate percentage

## Integration

### Game.ts Integration

**1. System Initialization:**
```typescript
class Game {
  regionVersionManager = new RegionVersionManager();
  pathRequestQueue = new PathRequestQueue(this.regionVersionManager);
}
```

**2. Deferred Rebuild Hook:**
When navigation grid is rebuilt, all affected regions are invalidated:
```typescript
processQueue(): void {
  if (this.fullRebuildQueued) {
    // Get all region IDs
    const allRegions = Array.from(this.game.regionManager.getRegions().keys());
    
    // Rebuild navigation grid
    this.game.navigationManager.rebuildNavGrid();
    
    // Increment versions for all affected regions
    for (const regionId of allRegions) {
      this.game.regionVersionManager.markRegionChanged(regionId);
      this.affectedRegions.add(regionId);
    }
    
    // Invalidate path cache
    this.game.pathRequestQueue.invalidateCacheForRegions(Array.from(this.affectedRegions));
  }
}
```

**3. Cached Pathfinding:**
The `computePath` method now checks cache first:
```typescript
computePath(sx: number, sy: number, tx: number, ty: number) {
  // Try cache first
  const cached = this.pathRequestQueue.checkCache(sx, sy, tx, ty);
  if (cached) {
    return cached; // Cache hit - instant return
  }
  
  // Cache miss - compute path
  const result = this.navigationManager.computePath(sx, sy, tx, ty);
  
  // Store in cache with region version snapshot
  if (result && result.length > 0) {
    const affectedRegions = this.getRegionsAlongPath(result);
    const snapshot = this.regionVersionManager.createSnapshot(affectedRegions);
    this.pathRequestQueue.storePath(sx, sy, tx, ty, result, snapshot);
  }
  
  return result;
}
```

### Performance HUD Integration

Cache statistics are displayed in the performance HUD:

```
📦 Cache: 67.3% hits (142 entries, 0 queued)
  └─ 89 hits / 43 miss
```

**Metrics shown:**
- Cache hit rate percentage
- Number of cached paths
- Queue depth (for future async pathfinding)
- Detailed hit/miss breakdown (when details enabled)

## Performance Impact

### Expected Improvements

**Cache Hit Rates:**
- Stable colonies: 60-90% cache hit rate
- Dynamic colonies: 40-60% cache hit rate
- High construction: 20-40% cache hit rate

**Frame Time Savings:**
- 80-95% reduction in pathfinding time (on cache hits)
- Smoother frame times during pathfinding storms
- Instant path returns instead of 2-10ms A* computation

**Memory Usage:**
- ~100-200 bytes per cached path
- ~200KB total for 1000 cached paths
- Automatic cache cleanup for stale entries

## Cache Invalidation Strategy

**When regions change:**
1. Building placement/destruction → increment affected regions
2. Wall/door/floor changes → increment affected regions
3. Navigation grid rebuild → increment ALL regions
4. Cache entries validated on lookup via region version snapshot

**Granularity:**
- Entire regions invalidated (not individual tiles)
- Paths crossing changed regions invalidated automatically
- Paths outside changed regions remain valid

## Future Enhancements

### Phase 2: Async Path Queue (Not Yet Implemented)

The queue infrastructure supports async pathfinding but isn't used yet:

```typescript
// Request async path (future)
pathRequestQueue.requestPath(
  colonist,
  startX, startY,
  targetX, targetY,
  priority: 80,
  (path) => { colonist.path = path; }
);
```

**Benefits:**
- Spread pathfinding across multiple frames (2ms budget per frame)
- Prevent pathfinding storms completely
- Priority-based processing (combat > hauling > idle)

### Phase 3: Hierarchical Path Caching

Cache path segments between regions (not just full paths):
- Inter-region paths cached separately
- Compose full paths from cached segments
- Higher cache hit rate (segment reuse)

## Testing & Validation

### Testing Checklist

- [ ] Cache hit rate >60% in stable colonies
- [ ] Cache properly invalidated when buildings placed
- [ ] No stale paths used after walls destroyed
- [ ] Performance HUD shows accurate cache stats
- [ ] Memory usage reasonable (<500KB for cache)
- [ ] No cache corruption or invalid path returns

### Debug Console Commands

```javascript
// Check cache stats
game.pathRequestQueue.getStats()

// Clear cache manually
game.pathRequestQueue.clear()

// Force region version increment
game.regionVersionManager.markRegionChanged(1)

// Check if snapshot valid
const snapshot = game.regionVersionManager.createSnapshot([1,2,3])
game.regionVersionManager.validateSnapshot(snapshot)
```

## Implementation Notes

### Why Tile-Based Cache Keys?

Cache keys round to tile coordinates (divide by 32, then round):
- Better cache hit rate (nearby positions map to same tile)
- Reduces cache size (fewer unique keys)
- Still accurate enough for grid-based pathfinding

### Why Not Cache Danger Avoidance Paths?

`computePathWithDangerAvoidance` doesn't use cache because:
- Colonist-specific danger memory affects pathfinding
- Danger zones change dynamically per colonist
- Path validity depends on colonist state, not just world structure

### Region Version Overflow

Version numbers are regular JavaScript numbers (safe up to 2^53):
- Would take ~285 million years of continuous building at 1 build/second
- No overflow protection needed in practice

## Related Systems

- **Adaptive Tick Rate**: Reduces AI update frequency → fewer path requests
- **Budgeted Execution**: Would limit pathfinding to 2ms/frame (future async)
- **Region Manager**: Provides region IDs and reachability data
- **Navigation Grid**: Triggers cache invalidation on rebuilds

## Credits

Inspired by RimWorld's region-based pathfinding and caching strategies.
