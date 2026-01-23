import type { Colonist } from '../../types';
import type { Game } from '../../Game';
import { T } from '../../constants';
import { isMountainTile as checkIsMountainTile, mineMountainTile, ORE_PROPERTIES, getOreTypeFromId, OreType } from '../../terrain';
import { grantSkillXP, skillLevel, skillWorkSpeedMultiplier } from '../../skills/skills';
import type { ItemType } from '../../types/items';

// Handles the mining state (mountain tiles and rocks)
export function updateMineState(
  c: Colonist,
  game: Game,
  dt: number,
  changeState: (state: import('../../types').ColonistState, reason?: string) => void
) {
  const r = c.target as any;
  const stateSince = c.stateSince ?? 0;
  if (!r || (r.hp !== undefined && r.hp <= 0)) {
    if (stateSince >= 0.5) {
      if (r && r.gx !== undefined && r.gy !== undefined) {
        const tileKey = `${r.gx},${r.gy}`;
        if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
      } else if (r && game.assignedTargets.has(r)) {
        game.assignedTargets.delete(r);
      }
      c.task = null;
      c.target = null;
      game.clearPath(c);
      changeState('seekTask', 'rock gone');
    }
    return;
  }

  const isMountainTile = r.gx !== undefined && r.gy !== undefined;

  if (isMountainTile) {
    const { gx, gy } = r;
    const worldX = gx * T + T / 2;
    const worldY = gy * T + T / 2;
    const approachX = typeof (r as any).approachX === 'number' ? (r as any).approachX : (typeof r.x === 'number' ? r.x : worldX);
    const approachY = typeof (r as any).approachY === 'number' ? (r as any).approachY : (typeof r.y === 'number' ? r.y : worldY);

    const dx = worldX - c.x;
    const dy = worldY - c.y;
    const distance = Math.hypot(dx, dy);
    const approachDx = approachX - c.x;
    const approachDy = approachY - c.y;
    const approachDistance = Math.hypot(approachDx, approachDy);
    const interact = T;

    if (approachDistance <= interact + 2) {
      if (!checkIsMountainTile(game.terrainGrid, gx, gy)) {
        const tileKey = `${gx},${gy}`;
        if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
        c.task = null;
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'mountain already mined');
        return;
      }

      const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Mining') : 1;
      const miningLvl = c.skills ? skillLevel(c, 'Mining') : 0;
      const skillMult = skillWorkSpeedMultiplier(miningLvl);
      const workMult = equipMult * skillMult;

      if (!r.hp) {
        const idx = gy * game.terrainGrid.cols + gx;
        const rawOreType = getOreTypeFromId(game.terrainGrid.ores[idx]);
        const oreType = ORE_PROPERTIES[rawOreType] ? rawOreType : OreType.NONE;
        r.hp = ORE_PROPERTIES[oreType].hp;
      }

      r.hp -= 12 * dt * workMult;
      if (c.skills) grantSkillXP(c, 'Mining', 5 * dt, c.t || 0);

      if (r.hp <= 0) {
        const oreType = mineMountainTile(game.terrainGrid, gx, gy);

        if (oreType) {
          const safeOreType = ORE_PROPERTIES[oreType] ? oreType : OreType.NONE;
          const oreProps = ORE_PROPERTIES[safeOreType];
          const yieldMult = 1 + Math.min(0.5, miningLvl * 0.02);
          const amount = Math.round(oreProps.miningYield * yieldMult);

          let resourceType: ItemType;
          switch (safeOreType) {
            case OreType.COAL: resourceType = 'coal'; break;
            case OreType.COPPER: resourceType = 'copper'; break;
            case OreType.STEEL: resourceType = 'steel'; break;
            case OreType.SILVER: resourceType = 'silver'; break;
            case OreType.GOLD: resourceType = 'gold'; break;
            default: resourceType = 'rubble'; break;
          }

          const dropAt = { x: worldX, y: worldY };
          (game as any).itemManager?.dropItems(resourceType, amount, dropAt);
          game.msg(`Mined ${amount} ${oreProps.name}`, 'good');

          game.navigationManager.rebuildNavGridPartial(worldX, worldY, T * 2);
          game.renderManager?.invalidateWorldCache();
        }

        const tileKey = `${gx},${gy}`;
        if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
        c.task = null;
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'mined mountain');
      }
    } else {
      game.moveAlongPath(c, dt, { x: approachX, y: approachY }, interact);

      if (!(r as any).lastCheckTime || c.t - (r as any).lastCheckTime > 3) {
        const lastX = (r as any).lastCheckX ?? c.x;
        const lastY = (r as any).lastCheckY ?? c.y;
        const movedDist = Math.hypot(c.x - lastX, c.y - lastY);

        if ((r as any).lastCheckTime && movedDist < 10) {
          const tileKey = `${gx},${gy}`;
          if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
          c.task = null;
          c.target = null;
          game.clearPath(c);
          delete (r as any).lastCheckTime;
          delete (r as any).lastCheckX;
          delete (r as any).lastCheckY;
          changeState('seekTask', 'stuck mining mountain');
          return;
        }

        (r as any).lastCheckTime = c.t;
        (r as any).lastCheckX = c.x;
        (r as any).lastCheckY = c.y;
      }
    }

    if (stateSince > 20 && distance > interact + 4) {
      const tileKey = `${gx},${gy}`;
      if ((game as any).assignedTiles?.has(tileKey)) (game as any).assignedTiles.delete(tileKey);
      c.task = null;
      c.target = null;
      game.clearPath(c);
      delete (r as any).lastCheckTime;
      delete (r as any).lastCheckX;
      delete (r as any).lastCheckY;
      changeState('seekTask', 'mine timeout');
    }
    return;
  }

  // Rock mining branch
  const dx = r.x - c.x;
  const dy = r.y - c.y;
  const distance = Math.hypot(dx, dy);
  const interact = (r.r || 12) + c.r + 4;
  const slack = 2.5;
  const rockStateSince = c.stateSince ?? 0;

  if (Math.random() < 0.01) {
    console.log(`Mining: distance=${distance.toFixed(1)}, interact=${interact}, colonist at (${c.x.toFixed(1)}, ${c.y.toFixed(1)}), rock at (${r.x.toFixed(1)}, ${r.y.toFixed(1)})`);
  }

  if (distance <= interact + slack + 0.1) {
    const equipMult = (game as any).getWorkSpeedMultiplier ? (game as any).getWorkSpeedMultiplier(c, 'Mining') : 1;
    const miningLvl = c.skills ? skillLevel(c, 'Mining') : 0;
    const skillMult = skillWorkSpeedMultiplier(miningLvl);
    const workMult = equipMult * skillMult;
    r.hp -= 16 * dt * workMult;
    if (c.skills) grantSkillXP(c, 'Mining', 4 * dt, c.t || 0);
    if (r.hp <= 0) {
      const yieldMult = 1 + Math.min(0.5, miningLvl * 0.02);
      const amount = Math.round(5 * yieldMult);
      const dropAt = { x: r.x, y: r.y };
      (game as any).itemManager?.dropItems('stone', amount, dropAt);
      (game.rocks as any[]).splice((game.rocks as any[]).indexOf(r), 1);
      if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
      game.msg(`Dropped ${amount} stone`, 'good');

      if (rockStateSince >= 0.5) {
        c.task = null;
        c.target = null;
        game.clearPath(c);
        changeState('seekTask', 'mined rock');
      }
    }
    return;
  }

  game.moveAlongPath(c, dt, r, interact + slack);

  if (Math.random() < 0.01) {
    console.log(`Moving toward rock: target=(${r.x.toFixed(1)}, ${r.y.toFixed(1)}), distance=${distance.toFixed(1)}`);
  }

  if (rockStateSince > 15 && distance > interact + slack + 0.1) {
    console.log(`Colonist stuck mining for ${rockStateSince.toFixed(1)}s, abandoning`);
    if (game.assignedTargets.has(r)) game.assignedTargets.delete(r);
    c.task = null;
    c.target = null;
    game.clearPath(c);
    changeState('seekTask', 'mine timeout');
  }
}
