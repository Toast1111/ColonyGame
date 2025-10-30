/**
 * Unarmed Combat Test
 * 
 * Test the new unarmed combat system implementation
 */

import { selectUnarmedAttack, calculateUnarmedDamage, getUnarmedAverageDPS, UNARMED_ATTACKS } from '../combat/unarmedCombat';

export function testUnarmedCombat() {
  console.log('=== Unarmed Combat System Test ===');
  
  // Test attack selection
  console.log('\n1. Testing Attack Selection:');
  const attackCounts = { fist: 0, head: 0, teeth: 0 };
  
  for (let i = 0; i < 1000; i++) {
    const attack = selectUnarmedAttack();
    if (attack.name.includes('fist')) {
      attackCounts.fist++;
    } else if (attack.name === 'Head') {
      attackCounts.head++;
    } else if (attack.name === 'Teeth') {
      attackCounts.teeth++;
    }
  }
  
  console.log(`Fists: ${attackCounts.fist}/1000 (${(attackCounts.fist/10).toFixed(1)}%) - Expected: ~87%`);
  console.log(`Head: ${attackCounts.head}/1000 (${(attackCounts.head/10).toFixed(1)}%) - Expected: ~8.5%`);
  console.log(`Teeth: ${attackCounts.teeth}/1000 (${(attackCounts.teeth/10).toFixed(1)}%) - Expected: ~3%`);
  
  // Test damage calculation
  console.log('\n2. Testing Damage Calculation:');
  
  for (const attack of UNARMED_ATTACKS) {
    console.log(`\n${attack.name}:`);
    
    // Test against no armor
    const noArmor = calculateUnarmedDamage(attack, 0);
    console.log(`  No armor: ${noArmor.finalDamage} ${noArmor.damageType} damage, ${(attack.armorPenetration * 100).toFixed(0)}% AP`);
    
    // Test against 50% armor
    const withArmor = calculateUnarmedDamage(attack, 0.5);
    console.log(`  50% armor: ${withArmor.finalDamage} ${withArmor.damageType} damage (${((noArmor.finalDamage - withArmor.finalDamage) / noArmor.finalDamage * 100).toFixed(1)}% reduction)`);
    
    if (attack.stunOnFirstStrike) {
      console.log(`  Stun: ${attack.stunDuration}s on first strike`);
    }
  }
  
  // Test average DPS
  console.log('\n3. Testing Average DPS:');
  const avgDPS = getUnarmedAverageDPS();
  console.log(`Average DPS: ${avgDPS.toFixed(3)} - Expected: ~2.542`);
  
  console.log('\n=== Test Complete ===');
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).testUnarmedCombat = testUnarmedCombat;
}