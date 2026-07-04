// Deterministic PRNG so a stored `procedural_seed` always regenerates the
// exact same layout for a given universe.
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

export function genShareCode(len = 7) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Pick a color from a [hex, weight] palette using a seeded rng, so star
// colors are reproducible per universe seed.
export function pickWeighted(palette, rng) {
  const total = palette.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [color, w] of palette) {
    if (r < w) return color;
    r -= w;
  }
  return palette[0][0];
}

export const MEMORY_TYPES = [
  { value: 'message', label: 'Message' },
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'voice_note', label: 'Voice Note' },
  { value: 'letter', label: 'Letter' },
  { value: 'gift', label: 'Gift' },
  { value: 'flower', label: 'Flower' },
  { value: 'secret', label: 'Secret' },
  { value: 'final_surprise', label: 'Final Surprise' },
];

export const MEMORY_BEHAVIORS = [
  'pulse', 'colorShift', 'sparkle', 'zoomReveal',
  'emergeNebula', 'trail', 'driftShy', 'shimmer',
];

// Fallback client-side theme palette. In production this mirrors
// `public.universe_themes` in Supabase — fetched at runtime so creators
// can add themes later without a frontend redeploy.
//
// `starPalette` = weighted list of [hexColor, weight] pairs used to color
// individual decorative stars, so each theme has visually distinct star
// "temperatures" instead of one tinted base color. `bandColor` tints the
// dense Milky-Way-style band texture running across the sky.
export const FALLBACK_THEMES = {
  blue_galaxy: {
    label: 'Blue Galaxy', bg: '#040a14', star: '#dff2ff',
    nebula: ['#134e6f', '#1a2b4a'], planet: ['#2f7ea8', '#bfe6ff'], glow: '#4fc3f7',
    starPalette: [['#bfe9ff', 5], ['#e8faff', 4], ['#4fc3f7', 3], ['#ffffff', 2]],
    bandColor: '#1f7fae',
  },
  purple_nebula: {
    label: 'Purple Nebula', bg: '#0a0616', star: '#f1e6ff',
    nebula: ['#5b3e8e', '#341f56'], planet: ['#7d5ba6', '#c9a9e0'], glow: '#a678e0',
    starPalette: [['#e6d4ff', 5], ['#c9a9e0', 4], ['#ffffff', 3], ['#ff9ee0', 1]],
    bandColor: '#6a4b9e',
  },
  golden_cosmos: {
    label: 'Golden Cosmos', bg: '#0d0902', star: '#fff3d6',
    nebula: ['#7a5a20', '#4a3410'], planet: ['#c99a3f', '#f0d896'], glow: '#e6c98a',
    starPalette: [['#ffe8b0', 6], ['#fff3d6', 3], ['#ff9e5c', 2], ['#ffffff', 2]],
    bandColor: '#a37c2f',
  },
  moonlight: {
    label: 'Moonlight', bg: '#080c14', star: '#eef3f7',
    nebula: ['#3a4652', '#20262e'], planet: ['#7f97a8', '#e6eef2'], glow: '#cfe3f0',
    starPalette: [['#eef3f7', 6], ['#cfe3f0', 3], ['#ffffff', 4], ['#9fb8c9', 1]],
    bandColor: '#4a5a68',
  },
  fantasy: {
    label: 'Fantasy Universe', bg: '#0e0518', star: '#ffe0f5',
    nebula: ['#a04f9e', '#7a2f8e'], planet: ['#d968c0', '#ffb8e6'], glow: '#e08fe0',
    starPalette: [['#ffe0f5', 4], ['#ff8fd0', 3], ['#c98fff', 3], ['#ffffff', 2]],
    bandColor: '#9a4aa0',
  },
  dark_space: {
    label: 'Dark Space', bg: '#020202', star: '#dddddd',
    nebula: ['#1c1c1c', '#0c0c0c'], planet: ['#3a3a3a', '#8a8a8a'], glow: '#999999',
    starPalette: [['#dddddd', 6], ['#ffffff', 3], ['#9a9a9a', 3], ['#c9d6e8', 1]],
    bandColor: '#2a2a2a',
  },
  milky_way: {
    label: 'Milky Way', bg: '#06070f', star: '#fff8e8',
    nebula: ['#4a4470', '#2a2650'], planet: ['#8a86b8', '#e8e4ff'], glow: '#d8d4ff',
    starPalette: [['#fff8e8', 5], ['#e8e4ff', 4], ['#ffffff', 4], ['#ffd9a0', 2]],
    bandColor: '#5c5490',
  },
  pink_romantic: {
    label: 'Pink Romantic', bg: '#100610', star: '#ffe0ec',
    nebula: ['#8e3e6f', '#4a2040'], planet: ['#c9628f', '#ffb8d6'], glow: '#ff9ec4',
    starPalette: [['#ffe0ec', 5], ['#ff9ec4', 4], ['#ffffff', 3], ['#ffc9e6', 2]],
    bandColor: '#a0507e',
  },
};
