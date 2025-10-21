# Region Versioning & Path Cache - Quick Reference

## System Overview

**Purpose**: Cache pathfinding results and invalidate when world structure changes

**Components**:
- `RegionVersionManager` - Tracks region versions for cache validation
- `PathRequestQueue` - Caches paths with automatic invalidation

## Key Concepts

### Region Versions

Each region has a version number that increments when structure changes:

- Building placement/removal → region version++
- Wall/door/floor changes → region version++
- Navigation grid rebuild → all regions version++

### Cache Validation

Paths are cached with a "snapshot" of region versions:

```typescript
{
  path: [...],
  regionVersions: Map { 1 => 42, 2 => 38, 3 => 41 },
  timestamp: 1699...,
  hitCount: 5
}
```

Cache entry is valid if ALL region versions match current versions.

## Usage

### Automatic (Already Integrated)

The system is fully integrated into `Game.computePath()`:

1. Check cache → instant return if valid
2. Cache miss → compute path via A*
3. Store result in cache with region snapshot

No changes needed in FSM or colonist AI code.

### Manual Operations

#### Check Cache Stats

```javascript
const stats = game.pathRequestQueue.getStats();
// { cacheHits: 127, cacheMisses: 45, cacheSize: 89, ... }
```

#### Force Cache Clear

```javascript
game.pathRequestQueue.clear();
```

#### Invalidate Specific Regions

```javascript
game.pathRequestQueue.invalidateCacheForRegions([1, 2, 3]);
```

#### Mark Region Changed

```javascript
game.regionVersionManager.markRegionChanged(regionId);
```

## Performance HUD

View cache performance in-game (top-right HUD):

```
📦 Cache: 67.3% hits (142 entries, 0 queued)
  └─ 89 hits / 43 miss
```

Toggle details with `F3` (if debug mode enabled).

## Expected Performance

### Cache Hit Rates

- **Stable colonies**: 60-90%
- **Active building**: 40-60%  
- **Heavy construction**: 20-40%

### Frame Time Impact

- Cache hit: **<0.1ms** (instant lookup)
- Cache miss: **2-10ms** (normal A* pathfinding)
- **80-95% reduction** in pathfinding time when cache is hot

## Debugging

### Why is cache hit rate low?

- Heavy construction invalidates many regions
- Colonists exploring new areas (no cached paths yet)
- Frequent building placement/destruction

### How to verify cache works?

1. Let colonists establish paths (wait ~30 seconds)
2. Check HUD: should show >50% hit rate
3. Place a building → hit rate drops temporarily
4. Wait a bit → hit rate recovers as paths rebuild

### Debug Console

```javascript
// Get detailed stats
game.pathRequestQueue.getStats()

// Check region versions
game.regionVersionManager.getVersion(regionId)

// See all dirty regions
game.regionVersionManager.getDirtyRegions()

// Clear dirty regions
game.regionVersionManager.clearDirtyRegions()
```

## Integration Points

### When Regions Change

**Deferred Rebuild System** automatically invalidates cache:

```typescript
// In processQueue()
rebuildNavGrid();                    // Rebuild pathfinding grid
markRegionChanged(regionId);         // Increment version
invalidateCacheForRegions([...]);    // Clear affected cache entries
```

### Path Computation

**Game.computePath()** handles caching transparently:

```typescript
const path = game.computePath(startX, startY, targetX, targetY);
// Checks cache first, computes if needed, stores result
```

## Limitations

### Not Cached

- **Danger avoidance paths**: Colonist-specific, can't cache
- **Enemy paths**: Different pathfinding logic (currently)
- **Partial paths**: Only full start-to-end paths cached

### Cache Invalidation Granularity

- Invalidates entire regions (not individual tiles)
- Conservative (may invalidate more than strictly necessary)
- Trade-off: safety vs. cache retention

## Future Enhancements

### Async Path Queue (Planned)

Process pathfinding asynchronously across frames:

- Priority queue (combat > hauling > idle)
- 2ms budget per frame
- Prevents pathfinding storms

### Hierarchical Caching (Planned)

Cache region-to-region paths separately:

- Compose full paths from cached segments
- Higher cache hit rate (segment reuse)
- Better for long-distance paths

## Related Systems

- **Adaptive Tick Rate**: Reduces path requests
- **Region Manager**: Provides region data
- **Navigation Grid**: Triggers cache invalidation

## Quick Diagnostics

**Problem**: Paths not updating after building placement

**Solution**: Check region versions incremented:
```javascript
game.regionVersionManager.getDirtyRegions() // Should list affected regions
```

**Problem**: Cache hit rate is 0%

**Solution**: Check cache is being populated:
```javascript
game.pathRequestQueue.getStats().cacheSize // Should be > 0
```

**Problem**: Colonists using stale paths

**Solution**: Force cache clear:
```javascript
game.pathRequestQueue.clear()
game.rebuildNavGrid()
```
