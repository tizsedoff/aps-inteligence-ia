import { VisualCustomization } from '../types';

export const DEFAULT_CUSTOMIZATION: VisualCustomization = {
  // Background
  bgType: 'color',
  bgColor: '#040705',
  bgGradient: 'radial-gradient(ellipse at top, #0f1c14 0%, #050806 70%, #020302 100%)',
  bgImage: '',
  bgImageBlur: 0,
  bgImageOpacity: 0.4,

  // Liquid Glass Real Physics
  glassBlur: 24,
  glassOpacity: 0.65,
  glassBorderColor: 'rgba(197, 160, 89, 0.25)',
  glassSpecularGlow: true,

  // User Bubble (Gradient cyan/blue as in reference mockup)
  userBubbleGradient: 'linear-gradient(135deg, #0984e3 0%, #00cec9 100%)',
  userBubbleTextColor: '#ffffff',
  userBubbleRadius: 28,
  userBubbleShadow: true,

  // Model Bubble (Gradient warm orange-red as in reference mockup, or customizable)
  modelBubbleGradient: 'linear-gradient(135deg, #ff7675 0%, #e17055 100%)',
  modelBubbleTextColor: '#ffffff',
  modelBubbleRadius: 22,
  modelBubbleShadow: true,

  // Input & Header controls
  inputBarGradient: 'linear-gradient(90deg, #6c5ce7 0%, #0984e3 50%, #00b894 100%)',
  inputBarTextColor: '#ffffff',
  modelSelectorGradient: 'linear-gradient(135deg, #6c5ce7 0%, #0984e3 45%, #00b894 100%)',
  accentColor: '#00cec9',

  fontScale: 'md',

  // Official Logo Real Images
  logoCompact: '/logo-compact.png',
  logoLarge: '/logo-large.png',
};

export const THEME_PRESETS: { name: string; id: string; config: Partial<VisualCustomization> }[] = [
  {
    name: 'APS Mockup Oficial (Cyan / Naranja / Esmeralda)',
    id: 'mockup_official',
    config: {
      bgType: 'color',
      bgColor: '#000000',
      bgGradient: 'linear-gradient(180deg, #050505 0%, #000000 100%)',
      glassBlur: 26,
      glassOpacity: 0.7,
      userBubbleGradient: 'linear-gradient(135deg, #0984e3 0%, #00cec9 100%)',
      userBubbleTextColor: '#ffffff',
      userBubbleRadius: 30,
      modelBubbleGradient: 'linear-gradient(135deg, #ff7675 0%, #e17055 100%)',
      modelBubbleTextColor: '#ffffff',
      modelBubbleRadius: 24,
      inputBarGradient: 'linear-gradient(90deg, #6c5ce7 0%, #0984e3 45%, #00b894 100%)',
      modelSelectorGradient: 'linear-gradient(135deg, #6c5ce7 0%, #0984e3 40%, #00b894 100%)',
      accentColor: '#00cec9',
    },
  },
  {
    name: 'Old Money Luxury (Obsidiana & Oro Bruñido)',
    id: 'old_money_luxury',
    config: {
      bgType: 'color',
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
    },
  },
  {
    name: 'Cyber Liquid Neon (Violeta & Aqua)',
    id: 'cyber_neon',
    config: {
      bgType: 'color',
      bgColor: '#080512',
      bgGradient: 'radial-gradient(circle at top right, #240b36 0%, #080512 70%)',
      glassBlur: 28,
      glassOpacity: 0.75,
      glassBorderColor: 'rgba(214, 48, 49, 0.3)',
      userBubbleGradient: 'linear-gradient(135deg, #8e44ad 0%, #c0392b 100%)',
      userBubbleTextColor: '#ffffff',
      userBubbleRadius: 26,
      modelBubbleGradient: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
      modelBubbleTextColor: '#ecf0f1',
      modelBubbleRadius: 22,
      inputBarGradient: 'linear-gradient(90deg, #8e44ad 0%, #3498db 100%)',
      modelSelectorGradient: 'linear-gradient(135deg, #9b59b6 0%, #3498db 100%)',
      accentColor: '#9b59b6',
    },
  },
  {
    name: 'Aurora Boreal Glass',
    id: 'aurora_glass',
    config: {
      bgType: 'gradient',
      bgColor: '#030d0a',
      bgGradient: 'linear-gradient(135deg, #021b18 0%, #042921 50%, #010d0b 100%)',
      glassBlur: 30,
      glassOpacity: 0.6,
      userBubbleGradient: 'linear-gradient(135deg, #00b894 0%, #0984e3 100%)',
      userBubbleTextColor: '#ffffff',
      userBubbleRadius: 28,
      modelBubbleGradient: 'linear-gradient(135deg, #102a24 0%, #081714 100%)',
      modelBubbleTextColor: '#def7ec',
      modelBubbleRadius: 24,
      inputBarGradient: 'linear-gradient(90deg, #00b894 0%, #00cec9 100%)',
      modelSelectorGradient: 'linear-gradient(135deg, #00b894 0%, #0984e3 100%)',
      accentColor: '#00b894',
    },
  },
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
