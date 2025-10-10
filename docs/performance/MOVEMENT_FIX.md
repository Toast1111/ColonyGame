# Adaptive AI Tick Rate - Movement Fix

## Issue Fixed

Colonists were moving choppy when adaptive tick rates were enabled because movement was being skipped along with AI decision-making.

## Solution

### 1. Separated Movement from Decision-Making

**Always runs (60 Hz)**:
- Combat updates
- Movement along existing paths
- Animation/direction updates
- Time tracking

**Adaptive tick rate (1-20 Hz based on importance)**:
- AI decision-making
- State transitions
- Task selection
- New pathfinding requests

### 2. Increased Tick Rates for Visible Entities

Updated `IMPORTANCE_CONFIGS`:

| Level | Old Hz | New Hz | Change |
|-------|--------|--------|--------|
| CRITICAL | 15 | 20 | +33% - More responsive combat |
| NORMAL | 7.5 | 15 | +100% - Smooth visible movement |
| LOW | 3 | 5 | +67% - Better offscreen response |
| MINIMAL | 0.6 | 1 | +67% - More frequent sleep checks |

### 3. Expanded Critical Zone

Changed closeThreshold from 25% to 40% of viewport:
- More entities near camera get CRITICAL priority
- Smoother movement when player is watching
- Better responsiveness for visible colonists

## Result

- **Smooth movement**: Colonists move every frame even when AI is throttled
- **Responsive AI**: Visible entities update at 15-20 Hz (plenty for smooth gameplay)
- **Still efficient**: Offscreen/sleeping entities still throttled to 1-5 Hz

## Performance Impact

| Scenario | Update Rate | Smooth Movement |
|----------|-------------|-----------------|
| Visible colonists | 100% (every frame) | ✅ Yes |
| AI decisions (visible) | 15-20 Hz | ✅ Smooth enough |
| AI decisions (offscreen) | 1-5 Hz | ✅ Not visible anyway |
| AI decisions (sleeping) | 1 Hz | ✅ Adequate |

Movement is now **decoupled** from AI tick rate, so even LOW/MINIMAL entities move smoothly if they have an active path.
