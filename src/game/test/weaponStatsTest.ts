import { itemDatabase } from '../../data/itemDatabase';
import { calculateOptimalDPS, calculateDPSAtRange, getWeaponStatsSummary } from '../combat/weaponStats';
import { GAME_TICKS_PER_SECOND } from '../constants';

/**
 * Test and display weapon stats
 * This demonstrates the new weapon stats system
 */
export async function testWeaponStats() {
  await itemDatabase.loadItems();
  
  const weapons = ['Autopistol', 'AssaultRifle', 'SniperRifle', 'SMG', 'Knife'];
  
  console.log('=== WEAPON STATS TEST ===\n');
  
  for (const weaponName of weapons) {
    const def = itemDatabase.getItemDef(weaponName);
    if (!def) {
      console.log(`Weapon ${weaponName} not found`);
      continue;
    }
    
    const stats = getWeaponStatsSummary(def);
    const aimTime = def.aimTimeTicks ? (def.aimTimeTicks / GAME_TICKS_PER_SECOND) : 0.8;
    const cooldownTime = def.cooldownTicks ? (def.cooldownTicks / GAME_TICKS_PER_SECOND) : 1.0;
    
    console.log(`${def.label.toUpperCase()}`);
    console.log('-'.repeat(40));
    console.log(`Damage: ${def.damage}`);
    console.log(`Range: ${def.range} tiles`);
    console.log(`Burst Count: ${def.burstCount || 1}`);
    console.log(`Aim Time: ${aimTime.toFixed(2)}s (${def.aimTimeTicks || 24} RimWorld ticks)`);
    console.log(`Cooldown Time: ${cooldownTime.toFixed(2)}s (${def.cooldownTicks || 30} RimWorld ticks)`);
    console.log(`Armor Penetration: ${((def.armorPenetration || 0) * 100).toFixed(0)}%`);
    console.log(`Stopping Power: ${def.stoppingPower || 0}`);
    console.log('');
    console.log('ACCURACY BY RANGE:');
    console.log(`  Touch (3 tiles):   ${((def.accuracyTouch || 0.9) * 100).toFixed(0)}%`);
    console.log(`  Short (12 tiles):  ${((def.accuracyShort || 0.75) * 100).toFixed(0)}%`);
    console.log(`  Medium (25 tiles): ${((def.accuracyMedium || 0.6) * 100).toFixed(0)}%`);
    console.log(`  Long (40 tiles):   ${((def.accuracyLong || 0.4) * 100).toFixed(0)}%`);
    console.log('');
    console.log('DPS STATISTICS:');
    console.log(`  Optimal DPS (all hits): ${stats.optimalDPS.toFixed(2)}`);
    console.log(`  DPS at Touch:   ${stats.dpsTouch.toFixed(2)}`);
    console.log(`  DPS at Short:   ${stats.dpsShort.toFixed(2)}`);
    console.log(`  DPS at Medium:  ${stats.dpsMedium.toFixed(2)}`);
    console.log(`  DPS at Long:    ${stats.dpsLong.toFixed(2)}`);
    console.log('\n');
  }
  
  // Test body part HP
  console.log('=== BODY PART HP VALUES ===');
  console.log('-'.repeat(40));
  console.log('Head (contains brain): 10 HP');
  console.log('Torso (general body): 40 HP');
  console.log('Arms: 30 HP each');
  console.log('Legs: 35 HP each');
  console.log('\n');
  
  // Test armor penetration calculation
  console.log('=== ARMOR PENETRATION TEST ===');
  console.log('-'.repeat(40));
  const rifle = itemDatabase.getItemDef('AssaultRifle');
  const flakVest = itemDatabase.getItemDef('FlakVest');
  
  if (rifle && flakVest) {
    const damage = rifle.damage || 0;
    const ap = rifle.armorPenetration || 0;
    const armor = flakVest.armorRating || 0;
    
    console.log(`Rifle damage: ${damage}`);
    console.log(`Rifle AP: ${(ap * 100).toFixed(0)}%`);
    console.log(`Flak Vest armor: ${(armor * 100).toFixed(0)}%`);
    console.log(`Effective armor after AP: ${Math.max(0, armor - ap) * 100}%`);
    console.log(`Damage reduction: ${(Math.max(0, armor - ap) * 100).toFixed(0)}%`);
    console.log(`Actual damage dealt: ${Math.round(damage * (1 - Math.max(0, armor - ap)))}`);
  }
  console.log('\n');
  
  // Test stopping power
  console.log('=== STOPPING POWER TEST ===');
  console.log('-'.repeat(40));
  const sniper = itemDatabase.getItemDef('SniperRifle');
  if (sniper) {
    const sp = sniper.stoppingPower || 0;
    console.log(`Sniper Rifle stopping power: ${sp}`);
    if (sp >= 1) {
      console.log('✓ Can stagger humans (SP >= 1)');
      console.log('Effect: Reduces speed to 1/6th for 95 ticks (1.58 seconds)');
    } else {
      console.log('✗ Cannot stagger (SP < 1)');
    }
  }
  console.log('\n');
}

// Make it available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).testWeaponStats = testWeaponStats;
}
