// Core particle effects
export { createMuzzleFlash } from './muzzleFlash';
export { createProjectileTrail } from './projectileTrail';
export { createImpactEffect } from './impactEffect';

// Special particle effects
export { 
  createBloodSplatter, 
  createWoodDebris, 
  createStoneDebris,
  createExplosion,
  createHealingSparkles,
  createCraftingSparkles
} from './specialEffects';

// Particle system
export { updateParticles } from './particlePhysics';
export { drawParticles } from './particleRender';
