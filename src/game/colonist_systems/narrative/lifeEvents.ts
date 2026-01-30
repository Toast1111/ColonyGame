/**
 * Life events for colonist backstories
 */

export interface LifeEvent {
  event: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export const LIFE_EVENTS: LifeEvent[] = [
  // Dramatic negative events
  { event: "witnessed the collapse of a great bridge, taking hundreds with it", impact: 'negative' },
  { event: "was framed for a crime they didn't commit", impact: 'negative' },
  { event: "lost their voice for three years after a traumatic incident", impact: 'negative' },
  { event: "was abandoned in the wilderness and survived alone for weeks", impact: 'negative' },
  { event: "watched their mentor slowly lose their mind to a strange illness", impact: 'negative' },
  { event: "discovered their entire childhood was built on lies", impact: 'negative' },
  { event: "was sold into indentured servitude to pay family debts", impact: 'negative' },
  { event: "survived a shipwreck where they were the only survivor", impact: 'negative' },
  { event: "lost their entire family in a single night to raiders", impact: 'negative' },
  { event: "was infected with a flesh-eating parasite and barely recovered", impact: 'negative' },
  
  // Mysterious/unusual positive events
  { event: "discovered an ancient artifact that granted them strange dreams", impact: 'positive' },
  { event: "saved a noble's life and was granted a title they never used", impact: 'positive' },
  { event: "won a mysterious game of chance that changed their fortune", impact: 'positive' },
  { event: "found a hidden library containing forbidden knowledge", impact: 'positive' },
  { event: "was adopted by a master craftsperson after showing natural talent", impact: 'positive' },
  { event: "tamed a wild animal that became their lifelong companion", impact: 'positive' },
  { event: "decoded a secret message that led to buried wealth", impact: 'positive' },
  { event: "saved an entire village from poisoned water by noticing odd symptoms", impact: 'positive' },
  { event: "invented a tool that revolutionized their trade", impact: 'positive' },
  { event: "discovered they had royal blood through an old document", impact: 'positive' },
  
  // Ambiguous neutral events
  { event: "fell into a coma for six months and woke with no memory of that time", impact: 'neutral' },
  { event: "was struck by lightning and survived with strange scars", impact: 'neutral' },
  { event: "lived in complete isolation for a year by choice", impact: 'neutral' },
  { event: "switched identities with a stranger for reasons they won't explain", impact: 'neutral' },
  { event: "witnessed something in the sky that no one believes", impact: 'neutral' },
  { event: "found a sealed letter addressed to them from someone who died before they were born", impact: 'neutral' },
  { event: "was caught in a time loop that lasted three days but aged them a year", impact: 'neutral' },
  { event: "spoke to someone in a dream who turned out to be real", impact: 'neutral' },
  { event: "visited a place that no longer exists on any map", impact: 'neutral' },
  { event: "received a mysterious gift every year on their birthday from an unknown sender", impact: 'neutral' },
  
  // Dark/twisted events
  { event: "was forced to choose which family member would live", impact: 'negative' },
  { event: "ate something forbidden to survive", impact: 'negative' },
  { event: "committed an act of mercy killing that haunts them", impact: 'negative' },
  { event: "betrayed someone who trusted them completely", impact: 'negative' },
  { event: "witnessed a ritual they were never meant to see", impact: 'neutral' }
];
