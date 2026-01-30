/**
 * Common colonist data - names, preferences, etc.
 * Data used across colonist generation that doesn't fit into traits or narrative systems
 */

export const NAMES = {
  FIRST: [
    'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jamie', 'Avery',
    'Quinn', 'Sage', 'River', 'Rowan', 'Phoenix', 'Dakota', 'Skyler', 'Emery',
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
    'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas'
  ],
  LAST: [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'
  ]
};

export const FAVORITE_FOODS = [
  'Fresh Bread', 'Roasted Vegetables', 'Berry Pie', 'Hearty Stew', 'Honey Cakes',
  'Grilled Fish', 'Wild Mushrooms', 'Apple Cider', 'Cheese & Crackers', 'Herbal Tea'
];

/**
 * Utility function for random selection
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
