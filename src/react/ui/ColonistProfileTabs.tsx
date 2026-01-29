import { useState } from 'react';

// ==================== SKILLS TAB ====================
export function SkillsTab({ skills, uiScale }: { skills: any[]; uiScale: number }) {
  const [hoveredSkill, setHoveredSkill] = useState<any>(null);
  
  return (
    <div className="colonist-skills-tab">
      <h3 className="colonist-section-title">Skills</h3>
      {skills.length === 0 ? (
        <div className="colonist-bio-empty">No skills data</div>
      ) : (
        <div className="colonist-skills">
          {skills.map((skill) => (
            <div
              key={skill.name}
              className="colonist-skill-row"
              onMouseEnter={() => setHoveredSkill(skill)}
              onMouseLeave={() => setHoveredSkill(null)}
            >
              <div className="colonist-skill-name">{skill.name}</div>
              <div className="colonist-skill-level">{skill.level}</div>
              <div className="colonist-skill-passion" data-passion={skill.passion || 'none'}>
                {skill.passion === 'burning' ? '★★' : skill.passion === 'interested' ? '★' : ''}
              </div>
              <div className="colonist-skill-bar">
                <div className="colonist-skill-bar-fill" style={{ width: `${skill.pct * 100}%` }} />
                <span className="colonist-skill-bar-label">{Math.round(skill.pct * 100)}%</span>
              </div>
              {hoveredSkill === skill && (
                <div className="colonist-skill-tooltip">
                  <div><strong>{skill.name} (Level {skill.level})</strong></div>
                  <div>XP: {Math.round(skill.xp)}/{Math.round(skill.needed)}</div>
                  <div>To next: {Math.round(skill.needed - skill.xp)}</div>
                  {skill.recentGain > 0 && <div>Recent gain: +{skill.recentGain.toFixed(1)} XP</div>}
                  <div>Passion: {skill.passion || 'none'} ({skill.passion === 'burning' ? 'x200%' : skill.passion === 'interested' ? 'x150%' : 'x100%'})</div>
                  <div>Work Speed: {skill.workSpeed.toFixed(0)}%</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== GEAR TAB ====================
export function GearTab({ gear, uiScale }: { gear: any; uiScale: number }) {
  const getQualityColor = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case 'legendary': return '#a855f7';
      case 'masterwork': return '#f59e0b';
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'poor': return '#ef4444';
      case 'awful': return '#991b1b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="colonist-gear-tab">
      <h3 className="colonist-section-title">Equipment & Inventory</h3>
      
      {!gear.hasInventory ? (
        <div className="colonist-bio-empty">No inventory data available</div>
      ) : (
        <>
          <div className="colonist-gear-section">
            <h4 className="colonist-bio-section-title">Equipment</h4>
            <div className="colonist-gear">
              {gear.equipment.map((item: any) => (
                <div key={item.slot} className="colonist-gear-row">
                  <span className="colonist-gear-slot">{item.slot}:</span>
                  {item.name ? (
                    <>
                      <span className="colonist-gear-name" data-quality={item.quality} style={{ color: getQualityColor(item.quality) }}>
                        {item.name}
                      </span>
                      <span className="colonist-gear-quality">({item.quality || 'normal'})</span>
                      {item.durability !== undefined && <span className="colonist-gear-durability">{Math.round(item.durability)}%</span>}
                    </>
                  ) : (
                    <span className="colonist-gear-name" style={{ color: '#6b7280' }}>None</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="colonist-gear-section">
            <h4 className="colonist-bio-section-title">Inventory Items</h4>
            {gear.items.length === 0 ? (
              <div className="colonist-bio-empty">No items in inventory</div>
            ) : (
              <div className="colonist-gear">
                {gear.items.map((item: any, idx: number) => (
                  <div key={idx} className="colonist-gear-row">
                    <span className="colonist-gear-name" data-quality={item.quality} style={{ color: getQualityColor(item.quality) }}>
                      {item.name} ({item.quantity})
                    </span>
                    <span className="colonist-gear-quality">{item.quality || 'normal'}</span>
                    {item.durability !== undefined && <span className="colonist-gear-durability">{Math.round(item.durability)}%</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {gear.carrying.length > 0 && (
            <div className="colonist-gear-section">
              <h4 className="colonist-bio-section-title">Currently Carrying</h4>
              <div className="colonist-gear">
                {gear.carrying.map((item: any, idx: number) => (
                  <div key={idx} className="colonist-gear-row colonist-gear-row--carry">
                    {item.name} ({item.qty})
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==================== SOCIAL TAB ====================
export function SocialTab({ relationships, uiScale }: { relationships: any[]; uiScale: number }) {
  return (
    <div className="colonist-social-tab">
      <h3 className="colonist-section-title">Social Relationships</h3>
      <div className="colonist-social-note">Social skill: Novice</div>
      
      <h4 className="colonist-bio-section-title">Colony Relationships</h4>
      {relationships.length === 0 ? (
        <div className="colonist-bio-empty">No other colonists in colony</div>
      ) : (
        <div className="colonist-social">
          {relationships.map((rel) => (
            <div key={rel.name} className="colonist-social-row">
              <span className="colonist-social-name">{rel.name}</span>
              <span className="colonist-social-rel" style={{ color: rel.color }}>{rel.relationship}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== LOG TAB ====================
export function LogTab({ entries, uiScale }: { entries: any[]; uiScale: number }) {
  const getLogColor = (type?: string) => {
    switch (type) {
      case 'work': return '#60a5fa';
      case 'need': return '#22c55e';
      case 'rest': return '#a78bfa';
      case 'combat': return '#f87171';
      case 'social': return '#fbbf24';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="colonist-log-tab">
      <h3 className="colonist-section-title">Activity Log</h3>
      {entries.length === 0 ? (
        <div className="colonist-bio-empty">No activity recorded yet.</div>
      ) : (
        <div className="colonist-log">
          {entries.map((entry, idx) => (
            <div key={idx} className="colonist-log-row">
              <span className="colonist-log-stamp">{entry.stamp}</span>
              <span className="colonist-log-label" style={{ color: getLogColor(entry.type) }}>{entry.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== HEALTH TAB ====================
export function HealthTab({ colonist, uiScale }: { colonist: any; uiScale: number }) {
  const game = (window as any).game;
  const [subTab, setSubTab] = useState<'overview' | 'operations' | 'injuries'>(
    game?.colonistHealthSubTab || 'overview'
  );

  const handleSubTabChange = (tab: 'overview' | 'operations' | 'injuries') => {
    setSubTab(tab);
    if (game) game.colonistHealthSubTab = tab;
  };

  return (
    <div className="colonist-health-tab">
      <div className="health-subtabs">
        <button
          className={`health-subtab${subTab === 'overview' ? ' active' : ''}`}
          onClick={() => handleSubTabChange('overview')}
        >
          Overview
        </button>
        <button
          className={`health-subtab${subTab === 'operations' ? ' active' : ''}`}
          onClick={() => handleSubTabChange('operations')}
        >
          Operations
        </button>
        <button
          className={`health-subtab${subTab === 'injuries' ? ' active' : ''}`}
          onClick={() => handleSubTabChange('injuries')}
        >
          Injuries
        </button>
      </div>

      <div className="health-content">
        {subTab === 'overview' && <HealthOverviewTab colonist={colonist} uiScale={uiScale} />}
        {subTab === 'operations' && <HealthOperationsTab colonist={colonist} uiScale={uiScale} />}
        {subTab === 'injuries' && <HealthInjuriesTab colonist={colonist} uiScale={uiScale} />}
      </div>
    </div>
  );
}

function HealthOverviewTab({ colonist, uiScale }: { colonist: any; uiScale: number }) {
  const game = (window as any).game;
  const profile = colonist.profile;
  const age = profile?.age || 25;
  const gender = profile?.gender || 'Unknown';
  const selfTend = colonist.selfTend || false;

  const toggleSelfTend = () => {
    if (game?.selColonist) {
      game.selColonist.selfTend = !game.selColonist.selfTend;
      game.msg?.(`Self-tend ${game.selColonist.selfTend ? 'enabled' : 'disabled'}`, 'info');
    }
  };

  const hunger = colonist.hunger || 0;
  const fatigue = colonist.fatigue || 0;
  const energy = 100 - fatigue;

  // Simplified bodily systems for now
  const systems = [
    { name: 'Consciousness', capacity: 100, fatal: true },
    { name: 'Sight', capacity: 100, fatal: false },
    { name: 'Hearing', capacity: 100, fatal: false },
    { name: 'Moving', capacity: 100, fatal: false },
    { name: 'Manipulation', capacity: 100, fatal: false },
    { name: 'Breathing', capacity: 100, fatal: true },
    { name: 'Blood Pumping', capacity: 100, fatal: true },
  ];

  const getCapacityColor = (capacity: number, fatal: boolean) => {
    if (capacity >= 70) return '#22c55e';
    if (capacity >= 50) return '#fbbf24';
    if (capacity >= 30) return '#f59e0b';
    return '#dc2626';
  };

  return (
    <div className="health-overview">
      <div className="health-section">
        <h4 className="colonist-bio-section-title">Creature Info</h4>
        <div className="health-info-grid">
          <div>Type: Human</div>
          <div>Gender: {gender}</div>
          <div>Age: {age} years</div>
        </div>
      </div>

      <div className="health-section">
        <div className="health-section-header">
          <h4 className="colonist-bio-section-title">Self-tend</h4>
          <button
            className={`health-toggle${selfTend ? ' active' : ''}`}
            onClick={toggleSelfTend}
          >
            {selfTend ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="health-section health-section--separated">
        <h4 className="colonist-bio-section-title">Needs</h4>
        <div className="health-needs">
          <div className="health-need-row">
            <span className="health-need-label">Hunger</span>
            <div className="health-need-bar">
              <div
                className="health-need-bar-fill"
                style={{
                  width: `${hunger}%`,
                  backgroundColor: hunger > 80 ? '#dc2626' : hunger > 60 ? '#f59e0b' : '#22c55e'
                }}
              />
            </div>
            <span className="health-need-value">{Math.round(hunger)}%</span>
            {hunger > 90 && <span className="health-need-warning">STARVING</span>}
          </div>
          <div className="health-need-row">
            <span className="health-need-label">Energy</span>
            <div className="health-need-bar">
              <div
                className="health-need-bar-fill"
                style={{
                  width: `${energy}%`,
                  backgroundColor: fatigue > 80 ? '#dc2626' : fatigue > 60 ? '#f59e0b' : '#22c55e'
                }}
              />
            </div>
            <span className="health-need-value">{Math.round(energy)}%</span>
            {fatigue > 90 && <span className="health-need-warning">EXHAUSTED</span>}
          </div>
        </div>
      </div>

      <div className="health-section health-section--separated">
        <h4 className="colonist-bio-section-title">Bodily Systems</h4>
        <div className="health-systems">
          {systems.map((system) => (
            <div key={system.name} className="health-system-row">
              <span className="health-system-label">{system.name}</span>
              <div className="health-system-bar">
                <div
                  className="health-system-bar-fill"
                  style={{
                    width: `${system.capacity}%`,
                    backgroundColor: getCapacityColor(system.capacity, system.fatal)
                  }}
                />
              </div>
              <span className="health-system-value">{system.capacity}%</span>
              {system.fatal && system.capacity < 30 && <span className="health-system-critical">CRITICAL</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthOperationsTab({ colonist, uiScale }: { colonist: any; uiScale: number }) {
  return (
    <div className="health-operations">
      <h4 className="colonist-bio-section-title">Surgical Operations</h4>
      <div className="colonist-bio-empty">
        No operations available yet
      </div>
    </div>
  );
}

function HealthInjuriesTab({ colonist, uiScale }: { colonist: any; uiScale: number }) {
  const injuries = colonist.health?.injuries || [];

  return (
    <div className="health-injuries">
      <h4 className="colonist-bio-section-title">Injuries & Conditions</h4>
      {injuries.length === 0 ? (
        <div className="colonist-bio-empty">No injuries or conditions</div>
      ) : (
        <div className="health-injury-list">
          {injuries.map((injury: any, idx: number) => (
            <div key={idx} className="health-injury-row">
              <div className="health-injury-part">{injury.part}</div>
              <div className="health-injury-type">{injury.type}</div>
              <div className="health-injury-severity">{Math.round(injury.severity * 100)}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
