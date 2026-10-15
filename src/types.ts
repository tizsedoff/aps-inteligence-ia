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

export interface TerminalLogEntry {
  type: 'input' | 'stdout' | 'stderr' | 'system' | 'thinking';
  text: string;
  time: string;
}

export interface TerminalSessionState {
  command: string;
  history: string[];
  isProcessing: boolean;
  activeTab: 'terminal' | 'editor' | 'preview';
  isFullScreenPreview: boolean;
  isSplitView: boolean;
  files: CliFile[];
  activeFileIndex: number;
  terminalLogs: TerminalLogEntry[];
  lineProgress: { filename: string; current: number; total: number } | null;
  lastActiveCommand?: string;
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
  accentColor2?: string; // segundo color de acento (degradados, titulos)
  accentColor2Soft?: string;
  themeId?: string; // id del preset activo

  // Typography
  fontScale: 'sm' | 'md' | 'lg';

  // Real Logo Images (URLs or Base64 / SVG)
  logoCompact?: string; // Para flecha de enviar y 3 barras de menú
  logoLarge?: string; // Para cabecera, sidebar, bienvenida y login
}

export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'personal' | 'project' | 'general';
  source?: 'user' | 'auto';
  timestamp: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  token?: string;
  membership: string;
  isAdmin: boolean;
  customInstructions?: string; // Prompt / personalización directa para la IA
  memories?: MemoryItem[]; // Lista de recuerdos y datos aprendidos
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
