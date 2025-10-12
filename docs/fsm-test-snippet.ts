// Test snippet for FSM Blueprint Editor
// Copy and paste this into the editor to verify it works

export function updateTestFSM(game: any, entity: Entity, dt: number) {
  // This is a simplified example showing the pattern
  
  function changeState(newState: string, reason?: string) {
    entity.state = newState;
    console.log(`State change: ${reason}`);
  }

  switch (entity.state) {
    case 'idle': {
      // Waiting for tasks
      if (entity.danger) changeState('flee', 'danger detected');
      if (entity.task) changeState('work', 'task assigned');
      if (entity.hunger > 80) changeState('eat', 'very hungry');
      break;
    }
    
    case 'flee': {
      // Emergency escape
      if (!entity.danger) changeState('idle', 'safe now');
      if (entity.hp < 20) changeState('heal', 'critically injured');
      break;
    }
    
    case 'heal': {
      // Seeking medical attention
      if (entity.hp > 80) changeState('idle', 'recovered');
      break;
    }
    
    case 'eat': {
      // Consuming food
      if (entity.hunger < 20) changeState('idle', 'no longer hungry');
      break;
    }
    
    case 'work': {
      // Performing task
      if (entity.taskComplete) changeState('idle', 'task finished');
      if (entity.danger) changeState('flee', 'danger while working');
      if (entity.hunger > 90) changeState('eat', 'starving');
      break;
    }
    
    default: {
      // Unknown state, reset to idle
      changeState('idle', 'unknown state reset');
      break;
    }
  }
}

// Expected result when parsed:
// - 5 states: idle, flee, heal, eat, work
// - Multiple transitions with conditions
// - Auto-detected priorities and types
