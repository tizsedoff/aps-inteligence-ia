export type ApsModelId = 'APS INSTANT' | 'APS PRO' | 'APS HARD WORK';
export type InteractionMode = 'code' | 'teens' | 'adults';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64 string
  mimeType: string;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  model?: ApsModelId;
  mode?: InteractionMode;
  attachments?: Attachment[];
  thinking?: string;
  isThinkingActive?: boolean;
  timestamp: number;
  durationMs?: number;
  error?: boolean;
}

export interface CliFile {
  filename: string;
  language: string;
  code: string;
  description?: string;
}

export interface CliExecutionResult {
  command: string;
  status: 'success' | 'error';
  executionSummary: string;
  generatedFiles: CliFile[];
  stdout: string;
  extendedReasoning?: string;
  timestamp: number;
}

export interface VisualCustomization {
  // Background
  bgType: 'color' | 'gradient' | 'image';
  bgColor: string;
  bgGradient: string;
  bgImage: string;
  bgImageBlur: number;
  bgImageOpacity: number;

  // Liquid Glass Physics
  glassBlur: number; // in px: 0 to 40
  glassOpacity: number; // 0.2 to 0.95
  glassBorderColor: string;
  glassSpecularGlow: boolean;

  // Chat Bubbles Customization
  userBubbleGradient: string;
  userBubbleTextColor: string;
  userBubbleRadius: number; // in px
  userBubbleShadow: boolean;

  modelBubbleGradient: string;
  modelBubbleTextColor: string;
  modelBubbleRadius: number; // in px
  modelBubbleShadow: boolean;

  // Input & Header
  inputBarGradient: string;
  inputBarTextColor: string;
  modelSelectorGradient: string;
  accentColor: string;

  // Typography
  fontScale: 'sm' | 'md' | 'lg';
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  token?: string;
}

export interface CookiePreferences {
  accepted: boolean;
  necessary: boolean;
  performance: boolean;
  personalization: boolean;
  timestamp: number;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  extendedThinking: boolean;
  soundEffects: boolean;
}
