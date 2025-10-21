/**
 * ResourceSystem - Manages colony resources and storage
 * 
 * Responsibilities:
 * - Track resource quantities (wood, stone, food, medicine, herbal)
 * - Handle resource transactions (add/subtract)
 * - Manage storage capacity
 * - Resource cost checking and payment
 */

export interface Resources {
  wood: number;
  stone: number;
  food: number;
  medicine: number;
  herbal: number;
  wheat: number;
  bread: number;
  // Ore resources from mountains
  coal: number;
  copper: number;
  steel: number;
  silver: number;
  gold: number;
}

export type ResourceType = keyof Resources;

export class ResourceSystem {
  private resources: Resources = {
    wood: 0,
    stone: 0,
    food: 0,
    medicine: 5,
    herbal: 3,
    wheat: 0,
    bread: 0,
    coal: 0,
    copper: 0,
    steel: 0,
    silver: 0,
    gold: 0
  };
  
  private baseStorage = 200;
  private storageFullWarned = false;
  
  /**
   * Get current storage capacity
   * Pass in building count functions to calculate total capacity
   */
  getStorageCapacity(warehouseCount = 0, tentCount = 0): number {
    return this.baseStorage + warehouseCount * 500 + tentCount * 100;
  }
  
  /**
   * Get total resources currently stored
   */
  getTotalStored(): number {
    return this.resources.wood + this.resources.stone + this.resources.food;
  }
  
  /**
   * Check if storage is full
   */
  isStorageFull(capacity: number): boolean {
    return this.getTotalStored() >= capacity;
  }
  
  /**
   * Add resources with storage capacity check
   * Returns amount actually added (may be less than requested if storage full)
   */
  addResource(type: ResourceType, amount: number, capacity: number): number {
    // Medicine, herbal, wheat, and bread have no storage limit
    if (type === 'medicine' || type === 'herbal' || type === 'wheat' || type === 'bread') {
      this.resources[type] += amount;
      return amount;
    }
    
    // Check storage capacity for physical resources
    const current = this.getTotalStored();
    const available = Math.max(0, capacity - current);
    const toAdd = Math.min(amount, available);
    
    if (toAdd > 0) {
      this.resources[type] += toAdd;
    }
    
    // Warn if storage full (but don't spam)
    if (toAdd < amount && !this.storageFullWarned) {
      this.storageFullWarned = true;
      return toAdd; // Caller can check if less was added
    } else if (toAdd === amount) {
      this.storageFullWarned = false;
    }
    
    return toAdd;
  }
  
  /**
   * Subtract resources (returns true if successful)
   */
  subtractResource(type: ResourceType, amount: number): boolean {
    if (this.resources[type] >= amount) {
      this.resources[type] -= amount;
      return true;
    }
    return false;
  }
  
  /**
   * Check if we have enough resources to pay a cost
   */
  hasCost(cost: Partial<Resources>): boolean {
    if (cost.wood && this.resources.wood < cost.wood) return false;
    if (cost.stone && this.resources.stone < cost.stone) return false;
    if (cost.food && this.resources.food < cost.food) return false;
    if (cost.medicine && this.resources.medicine < cost.medicine) return false;
    if (cost.herbal && this.resources.herbal < cost.herbal) return false;
    if (cost.wheat && this.resources.wheat < cost.wheat) return false;
    if (cost.bread && this.resources.bread < cost.bread) return false;
    return true;
  }
  
  /**
   * Pay a resource cost (deduct resources)
   * Returns true if successful, false if insufficient resources
   */
  payCost(cost: Partial<Resources>): boolean {
    if (!this.hasCost(cost)) return false;
    
    if (cost.wood) this.resources.wood -= cost.wood;
    if (cost.stone) this.resources.stone -= cost.stone;
    if (cost.food) this.resources.food -= cost.food;
    if (cost.medicine) this.resources.medicine -= cost.medicine;
    if (cost.herbal) this.resources.herbal -= cost.herbal;
    if (cost.wheat) this.resources.wheat -= cost.wheat;
    if (cost.bread) this.resources.bread -= cost.bread;
    
    return true;
  }
  
  /**
   * Get resource amount
   */
  getResource(type: ResourceType): number {
    return this.resources[type];
  }
  
  /**
   * Get all resources (returns copy)
   */
  getAllResources(): Resources {
    return { ...this.resources };
  }
  
  /**
   * Get resources reference (for direct read access - UI, etc.)
   * WARNING: Do not modify directly, use add/subtract methods
   */
  getResourcesRef(): Resources {
    return this.resources;
  }
  
  /**
   * Set resource amount directly (for save/load, cheats, etc.)
   */
  setResource(type: ResourceType, amount: number): void {
    this.resources[type] = Math.max(0, amount);
  }
  
  /**
   * Reset to initial state
   */
  reset(): void {
    this.resources = {
      wood: 50,
      stone: 30,
      food: 20,
      medicine: 5,
      herbal: 3,
      wheat: 0,
      bread: 0,
      coal: 0,
      copper: 0,
      steel: 0,
      silver: 0,
      gold: 0
    };
    this.storageFullWarned = false;
  }
  
  /**
   * Format cost as text (for UI)
   */
  formatCost(cost: Partial<Resources>): string {
    const parts: string[] = [];
    if (cost.wood) parts.push(`${cost.wood}w`);
    if (cost.stone) parts.push(`${cost.stone}s`);
    if (cost.food) parts.push(`${cost.food}f`);
    if (cost.medicine) parts.push(`${cost.medicine}m`);
    if (cost.herbal) parts.push(`${cost.herbal}h`);
    if (cost.wheat) parts.push(`${cost.wheat}wh`);
    if (cost.bread) parts.push(`${cost.bread}br`);
    return parts.join(' ');
  }
}
