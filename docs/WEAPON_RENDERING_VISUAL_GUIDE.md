# Weapon Rendering Visual Guide

## System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEAPON RENDERING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. Player drafts colonist (press 'R') or enemy appears
   │
   ▼
┌──────────────────────────┐
│  updateColonistCombat()  │
│  in pawnCombat.ts        │
└──────────────────────────┘
   │
   ├─► Sets: c.isAiming = true
   ├─► Sets: c.aimTarget = { x: enemy.x, y: enemy.y }
   └─► Sets: c.aimAngle = Math.atan2(...)
   │
   ▼
┌──────────────────────────┐
│  drawColonistAvatar()    │
│  in colonistRenderer.ts  │
└──────────────────────────┘
   │
   ├─► Draws colonist sprite layers (body, clothes, head, hair)
   │
   ▼
┌──────────────────────────┐
│  drawWeapon()            │
│  in weaponRenderer.ts    │
└──────────────────────────┘
   │
   ├─► Check if isAiming or isDrafted
   ├─► Get weapon from inventory
   ├─► Load weapon image from ImageAssets
   ├─► Position at hand/chest level
   ├─► Rotate by aimAngle
   ├─► Flip if aiming left
   └─► Draw weapon sprite
   │
   ▼
┌──────────────────────────┐
│  Player sees weapon      │
│  rotating toward target  │
└──────────────────────────┘
```

## Weapon Positioning Diagram

```
        Colonist Sprite (48px tall, 32px wide)
        ┌─────────────────────┐
        │      🙂 Head        │ ← -offsetY (top)
        │                     │
        │    👕 Body/Chest    │ ← Weapon attached here
        │      🔫━━━━━━━>     │   (weaponY = -offsetY + 24)
        │                     │
        │    🦵👖 Legs        │
        └─────────────────────┘
              (0, 0) ← Colonist center point
```

## Weapon Rotation Examples

```
Target to the RIGHT (0°)
    Colonist        Enemy
       🙂           👹
       🔫━━━━━━━>
       👖
       
Target ABOVE (90°)
       👹
        ▲
        ┃
       🔫
       🙂
       👖

Target to the LEFT (180°)
    Enemy          Colonist
     👹       <━━━━━━🔫🙂
                      👖
    (Weapon flips vertically to prevent upside-down)

Target BELOW (270°)
       🙂
       🔫
       👖
        ┃
        ▼
       👹
```

## Aim Angle Calculation

```typescript
// In updateColonistCombat()
c.aimAngle = Math.atan2(target.y - c.y, target.x - c.x);

Examples:
- Target to right:  aimAngle = 0° (0 radians)
- Target above:     aimAngle = 90° (π/2 radians)  
- Target to left:   aimAngle = 180° (π radians)
- Target below:     aimAngle = 270° (3π/2 radians)
```

## Weapon Flip Logic

```typescript
const angleInDegrees = (aimAngle * 180 / Math.PI + 360) % 360;
const shouldFlipWeapon = angleInDegrees > 90 && angleInDegrees < 270;

   0° ───────────────> No flip (pointing right)
    ▲                 ▼
    │                 │
  270°               90° 
    │                 │
    └────── 180° ─────┘
         FLIP ZONE
      (90° to 270°)
```

## Weapon Types & Sprites

```
RANGED WEAPONS (32x16px typical)
┌─────────────────────────────┐
│ AssaultRifle  🔫━━━━━━━━━━━ │ (Long, accurate)
│ SniperRifle   🔫━━━━━━━━━━━ │ (Very long, high damage)
│ Shotgun       🔫━━━━━━━     │ (Short, spread)
│ Autopistol    🔫━━━━━       │ (Small, fast fire)
│ Revolver      🔫━━━━━       │ (Medium, reliable)
└─────────────────────────────┘

MELEE WEAPONS (32x16px typical)
┌─────────────────────────────┐
│ Club          ⚒━━━━━         │ (Blunt damage)
│ Knife         🗡━━            │ (Fast, cut damage)
└─────────────────────────────┘
```

## Asset Loading Chain

```
1. PNG files in src/assets/things/item/equipment/
   └─> weapon-ranged/AssaultRifle.png
   └─> weapon-melee/Club.png

2. Import in images.ts
   import AssaultRifle from './things/item/equipment/weapon-ranged/AssaultRifle.png';

3. Load into ImageAssets
   { name: 'weapon_assault_rifle', path: AssaultRifle }

4. Map defName to asset name
   getWeaponImage('AssaultRifle') → 'weapon_assault_rifle'

5. Retrieve in weaponRenderer
   const weaponImage = imageAssets.getWeaponImage(weapon.defName);

6. Draw on canvas
   ctx.drawImage(weaponImage, -gripOffsetX, -weaponHeight/2, width, height);
```

## State Conditions for Weapon Display

```
┌─────────────────────────────────────────────┐
│ When does a weapon appear on a colonist?    │
├─────────────────────────────────────────────┤
│                                             │
│  ✅ colonist.isDrafted === true             │
│     OR                                       │
│  ✅ colonist.isAiming === true               │
│                                             │
│  AND                                         │
│                                             │
│  ✅ colonist.inventory?.equipment?.weapon    │
│     (has weapon equipped)                    │
│                                             │
│  AND                                         │
│                                             │
│  ✅ weapon.defName exists in ImageAssets     │
│     (weapon sprite available)                │
│                                             │
└─────────────────────────────────────────────┘
```

## Performance Considerations

```
Per Frame per Colonist:

IF isAiming OR isDrafted:
  1. Check conditions (1-2 property lookups)      ~0.001ms
  2. Get weapon image (Map lookup)                ~0.001ms
  3. Calculate rotation (1 atan2)                 ~0.002ms
  4. Canvas transformations (translate + rotate)  ~0.005ms
  5. Draw image (1 drawImage call)                ~0.010ms
  ────────────────────────────────────────────────────────
  Total: ~0.019ms per armed colonist
  
For 10 drafted colonists: ~0.19ms per frame
For 60 FPS: ~11.4ms available per frame
Impact: ~1.7% of frame budget (negligible)
```

## Integration Points

```
EXISTING SYSTEMS                 NEW WEAPON SYSTEM
┌──────────────────┐            ┌──────────────────┐
│ Colonist FSM     │─drafted───>│ Combat System    │
│                  │            │ sets isAiming    │
└──────────────────┘            └──────────────────┘
                                         │
┌──────────────────┐                    │
│ Inventory System │─weapon─────────────┤
│ (Equipment)      │                    │
└──────────────────┘                    ▼
                                ┌──────────────────┐
┌──────────────────┐            │ Weapon Renderer  │
│ ImageAssets      │─sprites───>│ drawWeapon()     │
│ (PNG loading)    │            └──────────────────┘
└──────────────────┘                    │
                                        │
┌──────────────────┐                    ▼
│ Colonist         │<───called by───────┤
│ Renderer         │                    │
└──────────────────┘                    │
         │                              │
         ▼                              │
┌──────────────────┐                    │
│ Canvas Drawing   │<───────────────────┘
│ (Final Output)   │
└──────────────────┘
```
