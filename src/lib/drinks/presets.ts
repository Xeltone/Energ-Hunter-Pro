export type Preset = {
  name: string;
  flavor: string;
  caffeine: number;
  sugar: number;
  volume: number;
};

export const PRESETS: Preset[] = [

  // Adrenaline Rush
  { name: "Adrenaline Rush", flavor: "Original", caffeine: 132, sugar: 54, volume: 0.45 },
  { name: "Adrenaline Rush", flavor: "Cyber Orange", caffeine: 132, sugar: 50, volume: 0.45 },
  { name: "Adrenaline Rush", flavor: "Ginseng & Lime", caffeine: 132, sugar: 52, volume: 0.45 },
  { name: "Adrenaline Rush", flavor: "Zero Sugar", caffeine: 132, sugar: 0, volume: 0.45 },
  { name: "Adrenaline Rush", flavor: "Guarana Berries", caffeine: 132, sugar: 51, volume: 0.45 },

  // Red Bull
  { name: "Red Bull", flavor: "Original", caffeine: 80, sugar: 27, volume: 0.25 },
  { name: "Red Bull", flavor: "Sugarfree", caffeine: 80, sugar: 0, volume: 0.25 },
  { name: "Red Bull", flavor: "Yellow Edition", caffeine: 80, sugar: 27, volume: 0.25 },
  { name: "Red Bull", flavor: "Red Edition", caffeine: 80, sugar: 27, volume: 0.25 },
  { name: "Red Bull", flavor: "Blue Edition", caffeine: 80, sugar: 27, volume: 0.25 },

  // Monster Energy
  { name: "Monster Energy", flavor: "Original", caffeine: 150, sugar: 55, volume: 0.5 },
  { name: "Monster Energy", flavor: "Ultra White", caffeine: 150, sugar: 0, volume: 0.5 },
  { name: "Monster Energy", flavor: "Mango Loco", caffeine: 150, sugar: 60, volume: 0.5 },
  { name: "Monster Energy", flavor: "Pipeline Punch", caffeine: 150, sugar: 45, volume: 0.5 },
  { name: "Monster Energy", flavor: "Ultra Paradise", caffeine: 150, sugar: 0, volume: 0.5 },

  // Flash Up
  { name: "Flash Up", flavor: "Original", caffeine: 135, sugar: 50, volume: 0.45 },
  { name: "Flash Up", flavor: "Berry Mix", caffeine: 135, sugar: 48, volume: 0.45 },
  { name: "Flash Up", flavor: "Mint & Lime", caffeine: 135, sugar: 46, volume: 0.45 },

  // Tornado Energy
  { name: "Tornado Energy", flavor: "Active Original", caffeine: 135, sugar: 48, volume: 0.45 },
  { name: "Tornado Energy", flavor: "Storm", caffeine: 135, sugar: 48, volume: 0.45 },
  { name: "Tornado Energy", flavor: "Ice Berry", caffeine: 135, sugar: 45, volume: 0.45 },
  { name: "Tornado Energy", flavor: "Coconut & Mango", caffeine: 135, sugar: 45, volume: 0.45 },

  // Burn
  { name: "Burn", flavor: "Original", caffeine: 150, sugar: 58, volume: 0.449 },
  { name: "Burn", flavor: "Apple & Kiwi", caffeine: 150, sugar: 58, volume: 0.449 },

  // Gorilla
  { name: "Gorilla", flavor: "Original", caffeine: 135, sugar: 55, volume: 0.45 },
  { name: "Gorilla", flavor: "Mango Coconut", caffeine: 135, sugar: 52, volume: 0.45 },
  { name: "Gorilla", flavor: "Sugar Free", caffeine: 135, sugar: 0, volume: 0.45 },

  // E-ON
  { name: "E-ON", flavor: "Citrus Punch", caffeine: 135, sugar: 52, volume: 0.45 },

  // Genesis
  { name: "Genesis", flavor: "Purple Star", caffeine: 135, sugar: 48, volume: 0.45 },

  // Volt Energy
  { name: "Volt Energy", flavor: "Blue", caffeine: 135, sugar: 49, volume: 0.45 },
  { name: "Volt Energy", flavor: "Zero Sugar", caffeine: 135, sugar: 0, volume: 0.45 },

  // Lit Energy
  { name: "Lit Energy", flavor: "Classic (Классический): клюква и барбарис", caffeine: 150, sugar: 52, volume: 0.45 },
  { name: "Lit Energy", flavor: "Original Zero (Оригинал без сахара)", caffeine: 150, sugar: 0, volume: 0.45 },
  { name: "Lit Energy", flavor: "Blueberry (Черника)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Granat (Гранат)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Peach (Персик)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Peach Mango (Персик-манго)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Mango Coconut (Манго-кокос)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Cola (Кола)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Strawberry Bubblegum (Клубничная жвачка)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Malina Crush (Малина)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Strawberry Blueberry (Клубника-черника)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Berry Coconut (Ягоды и кокос)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Citrus Punch (Цитрусовый пунш)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Yuzu-Lime (Юдзу-лайм)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Kiwi-Apple (Киви-яблоко)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Apple Raspberry (Яблоко-малина)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Banana Strawberry (Банан-клубника)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Sour Energy (Кислый энергетик)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Sprite Skittles (Спрайт Скиттлс)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Sour Gummy Worms (Кислые мармеладные червячки)", caffeine: 150, sugar: 49, volume: 0.45 },
  { name: "Lit Energy", flavor: "Mango Passionfruit (Манго-маракуйя)", caffeine: 150, sugar: 49, volume: 0.45 },

  // HotCat
  { name: "HotCat", flavor: "Multi-Fruit", caffeine: 135, sugar: 48, volume: 0.45 },

  // Coca-Cola Energy
  { name: "Coca-Cola Energy", flavor: "Original", caffeine: 140, sugar: 14, volume: 0.25 },
  { name: "Coca-Cola Energy", flavor: "Zero Sugar", caffeine: 140, sugar: 0, volume: 0.25 },

  // Java Monster
  { name: "Java Monster", flavor: "Original", caffeine: 100, sugar: 7, volume: 0.25 },
  { name: "Java Monster", flavor: "Pineapple Smash", caffeine: 100, sugar: 7, volume: 0.25 },
  { name: "Java Monster", flavor: "Black Cherry", caffeine: 100, sugar: 7, volume: 0.25 },

  // Cellucor
  { name: "Cellucor", flavor: "Original", caffeine: 120, sugar: 0, volume: 0.25 },
  { name: "Cellucor", flavor: "Peach", caffeine: 120, sugar: 0, volume: 0.25 },

  // Reign
  { name: "Reign", flavor: "Original", caffeine: 200, sugar: 0, volume: 0.25 },
  { name: "Reign", flavor: "Lime", caffeine: 200, sugar: 0, volume: 0.25 },

  // U-Boost
  { name: "U-Boost", flavor: "Original", caffeine: 120, sugar: 8, volume: 0.25 },
  { name: "U-Boost", flavor: "Citrus", caffeine: 120, sugar: 8, volume: 0.25 },

  // Bang Energy
  { name: "Bang Energy", flavor: "Original", caffeine: 150, sugar: 0, volume: 0.25 },
  { name: "Bang Energy", flavor: "Lime", caffeine: 150, sugar: 0, volume: 0.25 },

  // Velocity
  { name: "Velocity", flavor: "Original", caffeine: 150, sugar: 5, volume: 0.25 },
  { name: "Velocity", flavor: "Citrus", caffeine: 150, sugar: 5, volume: 0.25 },

  // Stinger
  { name: "Stinger", flavor: "Original", caffeine: 150, sugar: 18, volume: 0.25 },
  { name: "Stinger", flavor: "Lime", caffeine: 150, sugar: 18, volume: 0.25 },

  // Baikal Energy
  { name: "Baikal Energy", flavor: "Original", caffeine: 120, sugar: 20, volume: 0.25 },
  { name: "Baikal Energy", flavor: "Lime", caffeine: 120, sugar: 20, volume: 0.25 },

  // Velo
  { name: "Velo", flavor: "Original", caffeine: 150, sugar: 0, volume: 0.25 },
  { name: "Velo", flavor: "Berry", caffeine: 150, sugar: 0, volume: 0.25 },

  // Fever Energy
  { name: "Fever Energy", flavor: "Original", caffeine: 140, sugar: 7, volume: 0.25 },
  { name: "Fever Energy", flavor: "Orange", caffeine: 140, sugar: 7, volume: 0.25 },

  // Rockstar
  { name: "Rockstar", flavor: "Original", caffeine: 160, sugar: 15, volume: 0.25 },
  { name: "Rockstar", flavor: "Zero Sugar", caffeine: 160, sugar: 0, volume: 0.25 },
  { name: "Rockstar", flavor: "Pomegranate", caffeine: 160, sugar: 15, volume: 0.25 },

  // Pitbull
  { name: "Pitbull", flavor: "Original", caffeine: 150, sugar: 10, volume: 0.25 },
  { name: "Pitbull", flavor: "Zero Sugar", caffeine: 150, sugar: 0, volume: 0.25 },
  { name: "Pitbull", flavor: "Mango", caffeine: 150, sugar: 10, volume: 0.25 },

  // GU Energy
  { name: "GU Energy", flavor: "Original", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "GU Energy", flavor: "Citrus", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "GU Energy", flavor: "Tropical", caffeine: 180, sugar: 0, volume: 0.25 },

  // Nooc
  { name: "Nooc", flavor: "Original", caffeine: 160, sugar: 0, volume: 0.25 },
  { name: "Nooc", flavor: "Cucumber", caffeine: 160, sugar: 0, volume: 0.25 },
  { name: "Nooc", flavor: "Berry", caffeine: 160, sugar: 0, volume: 0.25 },

  // C4 Energy
  { name: "C4 Energy", flavor: "Original", caffeine: 140, sugar: 4, volume: 0.25 },
  { name: "C4 Energy", flavor: "Mango", caffeine: 140, sugar: 4, volume: 0.25 },
  { name: "C4 Energy", flavor: "Tropical", caffeine: 140, sugar: 4, volume: 0.25 },

  // Fuze
  { name: "Fuze", flavor: "Original", caffeine: 150, sugar: 8, volume: 0.25 },
  { name: "Fuze", flavor: "Tropical", caffeine: 150, sugar: 8, volume: 0.25 },
  { name: "Fuze", flavor: "Berry", caffeine: 150, sugar: 8, volume: 0.25 },

  // Full Throttle
  { name: "Full Throttle", flavor: "Original", caffeine: 180, sugar: 14, volume: 0.25 },
  { name: "Full Throttle", flavor: "Citrus", caffeine: 180, sugar: 14, volume: 0.25 },

  // Spike
  { name: "Spike", flavor: "Original", caffeine: 180, sugar: 14, volume: 0.25 },
  { name: "Spike", flavor: "Citrus", caffeine: 180, sugar: 14, volume: 0.25 },
  { name: "Spike", flavor: "Tropical", caffeine: 180, sugar: 14, volume: 0.25 },

  // Anarchy
  { name: "Anarchy", flavor: "Original", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "Anarchy", flavor: "Lime", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "Anarchy", flavor: "Tropical", caffeine: 180, sugar: 0, volume: 0.25 },

  // Xtreme Energy
  { name: "Xtreme Energy", flavor: "Original", caffeine: 170, sugar: 6, volume: 0.25 },
  { name: "Xtreme Energy", flavor: "Citrus", caffeine: 170, sugar: 6, volume: 0.25 },
  { name: "Xtreme Energy", flavor: "Tropical", caffeine: 170, sugar: 6, volume: 0.25 },

  // Thunder Energy
  { name: "Thunder Energy", flavor: "Original", caffeine: 160, sugar: 8, volume: 0.25 },
  { name: "Thunder Energy", flavor: "Citrus", caffeine: 160, sugar: 8, volume: 0.25 },
  { name: "Thunder Energy", flavor: "Tropical", caffeine: 160, sugar: 8, volume: 0.25 },

  // Rogue Energy
  { name: "Rogue Energy", flavor: "Original", caffeine: 200, sugar: 0, volume: 0.25 },
  { name: "Rogue Energy", flavor: "Citrus", caffeine: 200, sugar: 0, volume: 0.25 },
  { name: "Rogue Energy", flavor: "Tropical", caffeine: 200, sugar: 0, volume: 0.25 },

  // Jolt
  { name: "Jolt", flavor: "Original", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "Jolt", flavor: "Lime", caffeine: 180, sugar: 0, volume: 0.25 },
  { name: "Jolt", flavor: "Tropical", caffeine: 180, sugar: 0, volume: 0.25 },
  
  // Raptor Energy
  { name: "Raptor Energy", flavor: "Original", caffeine: 170, sugar: 8, volume: 0.25 },
  { name: "Raptor Energy", flavor: "Citrus", caffeine: 170, sugar: 8, volume: 0.25 },
  { name: "Raptor Energy", flavor: "Tropical", caffeine: 170, sugar: 8, volume: 0.25 },
];