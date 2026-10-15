import { VisualCustomization } from '../types';

/**
 * Tema base = APS Mockup Oficial (cyan / naranja / esmeralda).
 * Todos los presets se construyen sobre esta base, asi que elegir uno
 * reemplaza TODOS los valores del tema anterior (nada queda "mezclado").
 */
export const DEFAULT_CUSTOMIZATION: VisualCustomization = {
  themeId: 'mockup_official',

  // Background
  bgType: 'color',
  bgColor: '#000000',
  bgGradient: 'linear-gradient(180deg, #050505 0%, #000000 100%)',
  bgImage: '',
  bgImageBlur: 0,
  bgImageOpacity: 0.4,

  // Liquid Glass
  glassBlur: 26,
  glassOpacity: 0.7,
  glassBorderColor: 'rgba(255, 255, 255, 0.16)',
  glassSpecularGlow: true,

  // User Bubble
  userBubbleGradient: 'linear-gradient(135deg, #0984e3 0%, #00cec9 100%)',
  userBubbleTextColor: '#ffffff',
  userBubbleRadius: 30,
  userBubbleShadow: true,

  // Model Bubble
  modelBubbleGradient: 'linear-gradient(135deg, #ff7675 0%, #e17055 100%)',
  modelBubbleTextColor: '#ffffff',
  modelBubbleRadius: 24,
  modelBubbleShadow: true,

  // Input & Header controls
  inputBarGradient: 'linear-gradient(90deg, #6c5ce7 0%, #0984e3 45%, #00b894 100%)',
  inputBarTextColor: '#ffffff',
  modelSelectorGradient: 'linear-gradient(135deg, #6c5ce7 0%, #0984e3 40%, #00b894 100%)',
  accentColor: '#00cec9',
  accentColor2: '#0984e3',
  accentColor2Soft: '#a29bfe',

  fontScale: 'md',

  // Official Logo Real Images
  logoCompact: '/logo-compact.png',
  logoLarge: '/logo-large.png',
};

type Preset = { name: string; id: string; config: VisualCustomization };

const makePreset = (
  id: string,
  name: string,
  overrides: Partial<VisualCustomization>
): Preset => ({
  id,
  name,
  config: { ...DEFAULT_CUSTOMIZATION, ...overrides, themeId: id },
});

export const THEME_PRESETS: Preset[] = [
  makePreset('mockup_official', 'APS Mockup Oficial (Cyan / Naranja / Esmeralda)', {}),
  makePreset('old_money_luxury', 'Old Money Luxury (Obsidiana & Oro Bruñido)', {
    bgColor: '#070c09',
    bgGradient: 'radial-gradient(circle at 50% 20%, #15271d 0%, #070c09 80%)',
    glassBlur: 24,
    glassOpacity: 0.65,
    glassBorderColor: 'rgba(197, 160, 89, 0.3)',
    userBubbleGradient: 'linear-gradient(135deg, #2d553e 0%, #193224 100%)',
    userBubbleTextColor: '#f4e2b8',
    userBubbleRadius: 20,
    modelBubbleGradient: 'linear-gradient(135deg, #1b261e 0%, #0f1611 100%)',
    modelBubbleTextColor: '#e8ebe4',
    modelBubbleRadius: 20,
    inputBarGradient: 'linear-gradient(90deg, #1f392b 0%, #15241b 100%)',
    modelSelectorGradient: 'linear-gradient(135deg, #8a6829 0%, #c5a059 50%, #2e5c46 100%)',
    accentColor: '#c5a059',
    accentColor2: '#2e5c46',
    accentColor2Soft: '#d8b66f',
  }),
  makePreset('cyber_neon', 'Cyber Liquid Neon (Violeta & Aqua)', {
    bgColor: '#080512',
    bgGradient: 'radial-gradient(circle at top right, #240b36 0%, #080512 70%)',
    glassBlur: 28,
    glassOpacity: 0.75,
    glassBorderColor: 'rgba(155, 89, 182, 0.35)',
    userBubbleGradient: 'linear-gradient(135deg, #8e44ad 0%, #c0392b 100%)',
    userBubbleRadius: 26,
    modelBubbleGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
    modelBubbleTextColor: '#ecf0f1',
    modelBubbleRadius: 22,
    inputBarGradient: 'linear-gradient(90deg, #8e44ad 0%, #3498db 100%)',
    modelSelectorGradient: 'linear-gradient(135deg, #9b59b6 0%, #3498db 100%)',
    accentColor: '#9b59b6',
    accentColor2: '#3498db',
    accentColor2Soft: '#c39bd3',
  }),
  makePreset('aurora_glass', 'Aurora Boreal Glass', {
    bgType: 'gradient',
    bgColor: '#030d0a',
    bgGradient: 'linear-gradient(135deg, #021b18 0%, #042921 50%, #010d0b 100%)',
    glassBlur: 30,
    glassOpacity: 0.6,
    glassBorderColor: 'rgba(0, 184, 148, 0.3)',
    userBubbleGradient: 'linear-gradient(135deg, #00b894 0%, #0984e3 100%)',
    userBubbleRadius: 28,
    modelBubbleGradient: 'linear-gradient(135deg, #102a24 0%, #081714 100%)',
    modelBubbleTextColor: '#def7ec',
    modelBubbleRadius: 24,
    inputBarGradient: 'linear-gradient(90deg, #00b894 0%, #00cec9 100%)',
    modelSelectorGradient: 'linear-gradient(135deg, #00b894 0%, #0984e3 100%)',
    accentColor: '#00b894',
    accentColor2: '#0984e3',
    accentColor2Soft: '#81ecec',
  }),
];

export const CURATED_WALLPAPERS = [
  {
    name: 'Liquid Abstract Noir',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Dark Emerald Silk',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Obsidian Liquid Reflections',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80',
  },
  {
    name: 'Deep Blue Nebula',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
  },
];
