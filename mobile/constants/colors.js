const coffeeTheme = {
  primary: "#740000",
  background: "#FFF8F3",
  text: "#494747",
  border: "#E5D3B7",
  white: "#FFFFFF",
  textLight: "#c0bba2",
  card: "#FFFFFF",
  shadow: "#000000",
};

const forestTheme = {
  primary: "#2E7D32",
  background: "#E8F5E9",
  text: "#1B5E20",
  border: "#C8E6C9",
  white: "#FFFFFF",
  textLight: "#66BB6A",
  card: "#FFFFFF",
  shadow: "#000000",
};

const purpleTheme = {
  primary: "#6A1B9A",
  background: "#F3E5F5",
  text: "#4A148C",
  border: "#D1C4E9",
  white: "#FFFFFF",
  textLight: "#BA68C8",
  card: "#FFFFFF",
  shadow: "#000000",
};

const oceanTheme = {
  primary: "#0277BD",
  background: "#E1F5FE",
  text: "#01579B",
  border: "#B3E5FC",
  white: "#FFFFFF",
  textLight: "#4FC3F7",
  card: "#FFFFFF",
  shadow: "#000000",
};

const sunsetTheme = {
  primary: "#FF7E67",
  background: "#FFF3F0",
  text: "#2C1810",
  border: "#FFD5CC",
  white: "#FFFFFF",
  textLight: "#FFA494",
  card: "#FFFFFF",
  shadow: "#000000",
};

const mintTheme = {
  primary: "#00B5B5",
  background: "#E8F6F6",
  text: "#006666",
  border: "#B2E8E8",
  white: "#FFFFFF",
  textLight: "#66D9D9",
  card: "#FFFFFF",
  shadow: "#000000",
};

const midnightTheme = {
  primary: "#5DADE2",    // Light Blue (Brightened to pop against dark bg)
  background: "#0F172A", // Deep Midnight Blue (Slate 900)
  text: "#F1F5F9",       // Off-White (Slate 100 - easier on eyes than pure white)
  border: "#334155",     // Dark Blue-Grey border
  white: "#FFFFFF",      // Stays white (for text inside primary buttons)
  textLight: "#94A3B8",  // Muted Blue-Grey (Slate 400)
  card: "#1E293B",       // Lighter Midnight Blue (Slate 800 - creates depth)
  shadow: "#000000",     // Shadow stays black
};

const roseGoldTheme = {
  primary: "#E0BFB8",
  background: "#FDF6F5",
  text: "#4A3B38",
  border: "#F2D9D5",
  white: "#FFFFFF",
  textLight: "#C9A9A6",
  card: "#FFFFFF",
  shadow: "#000000",
};

export const THEMES = {
  coffee: coffeeTheme,
  forest: forestTheme,
  purple: purpleTheme,
  ocean: oceanTheme,
  sunset: sunsetTheme,
  mint: mintTheme,
  midnight: midnightTheme,
  roseGold: roseGoldTheme,
};

// 👇 change this to switch theme
export const COLORS = THEMES.coffee;