import React, { useState, useRef } from 'react';
import { VisualCustomization } from '../types';
import { THEME_PRESETS, CURATED_WALLPAPERS, DEFAULT_CUSTOMIZATION } from '../constants/themePresets';
import {
  X,
  Palette,
  Sparkles,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Sliders,
  Check,
  Eye,
  Layers,
  MessageCircle,
} from 'lucide-react';

interface CustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: VisualCustomization;
  onUpdateCustomization: (updated: Partial<VisualCustomization>) => void;
  onReset: () => void;
}

export const CustomizerModal: React.FC<CustomizerModalProps> = ({
  isOpen,
  onClose,
  customization,
  onUpdateCustomization,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'background' | 'bubbles' | 'glass' | 'controls'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onUpdateCustomization({
        bgType: 'image',
        bgImage: result,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#c5a059]/30 bg-[#09110c]/95 shadow-2xl backdrop-blur-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#c5a059]/20 bg-[#0e1a14]/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c5a059]/40 bg-[#16291e] text-[#f4e2b8] shadow-md">
              <Palette className="h-5 w-5 text-[#c5a059]" />
            </div>
            <div>
              <h2 className="font-serif-luxury text-base sm:text-lg font-bold tracking-wider text-[#f4e2b8]">
                ESTUDIO DE PERSONALIZACIÓN VISUAL
              </h2>
              <p className="text-xs text-[#8e9c8c]">
                Personaliza fondos, globos de texto, física de liquid glass y controles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-xl border border-[#c5a059]/20 bg-white/5 px-3 py-1.5 text-xs text-[#a7b3a5] hover:bg-white/10 hover:text-[#f4e2b8] transition-colors"
              title="Restablecer a valores por defecto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-[#8e9c8c] hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-[#c5a059]/15 bg-[#070c09] px-6 py-2 gap-2 scrollbar-none">
          {[
            { id: 'presets', label: 'Estilos Prediseñados', icon: Sparkles },
            { id: 'background', label: 'Fondo & Wallpapers', icon: ImageIcon },
            { id: 'bubbles', label: 'Globos de Texto', icon: MessageCircle },
            { id: 'glass', label: 'Física Liquid Glass', icon: Layers },
            { id: 'controls', label: 'Barras & Selectores', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'border border-[#c5a059]/40 bg-[#c5a059]/20 text-[#fbf5e8] shadow-sm font-semibold'
                    : 'text-[#8e9c8c] hover:bg-white/5 hover:text-[#d8b66f]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-[#c5a059]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <h3 className="font-serif-luxury text-sm font-semibold text-[#f4e2b8] uppercase tracking-wider">
                Selecciona un tema base para aplicar instantáneamente:
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onUpdateCustomization(preset.config)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#c5a059]/25 bg-[#0e1913]/80 p-5 text-left transition-all hover:border-[#c5a059]/60 hover:bg-[#14261d] hover:shadow-2xl"
                  >
                    <div>
                      <h4 className="font-serif-luxury text-sm font-bold text-[#fbf5e8] mb-1">
                        {preset.name}
                      </h4>
                      <p className="text-xs text-[#8e9c8c] mb-4">
                        Alineado con el estilo visual y gradientes ópticos característicos.
                      </p>
                    </div>

                    {/* Preview palette bar */}
                    <div className="flex items-center gap-2">
                      <div
                        className="h-5 w-12 rounded-full border border-white/20 shadow-sm"
                        style={{ background: preset.config.userBubbleGradient }}
                        title="Globo Usuario"
                      />
                      <div
                        className="h-5 w-12 rounded-full border border-white/20 shadow-sm"
                        style={{ background: preset.config.modelBubbleGradient }}
                        title="Globo APS"
                      />
                      <div
                        className="h-5 w-12 rounded-full border border-white/20 shadow-sm"
                        style={{ background: preset.config.modelSelectorGradient }}
                        title="Selector Modelo"
                      />
                      <span className="text-[10px] font-mono-code text-[#c5a059] ml-auto">
                        Aplicar
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BACKGROUND & WALLPAPERS */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              {/* Type Switcher */}
              <div>
                <label className="font-serif-luxury text-xs font-semibold text-[#c5a059] uppercase tracking-wider block mb-2">
                  Tipo de Fondo
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'color', label: 'Color Sólido' },
                    { id: 'gradient', label: 'Degradado Cósmico' },
                    { id: 'image', label: 'Imagen / Wallpaper' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateCustomization({ bgType: t.id as any })}
                      className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                        customization.bgType === t.id
                          ? 'border border-[#c5a059]/50 bg-[#c5a059]/25 text-[#fbf5e8] font-bold shadow'
                          : 'border border-white/10 bg-white/5 text-[#8e9c8c] hover:bg-white/10'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker if Color */}
              {customization.bgType === 'color' && (
                <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-4 space-y-3">
                  <label className="text-xs font-medium text-[#f4e2b8] block">
                    Color de Fondo Principal
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customization.bgColor}
                      onChange={(e) => onUpdateCustomization({ bgColor: e.target.value })}
                      className="h-10 w-16 cursor-pointer rounded-lg border border-[#c5a059]/30 bg-transparent p-1"
                    />
                    <input
                      type="text"
                      value={customization.bgColor}
                      onChange={(e) => onUpdateCustomization({ bgColor: e.target.value })}
                      className="rounded-lg border border-[#c5a059]/25 bg-[#060b08] px-3 py-1.5 font-mono-code text-xs text-[#fbf5e8]"
                    />
                  </div>
                </div>
              )}

              {/* Gradient if Gradient */}
              {customization.bgType === 'gradient' && (
                <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-4 space-y-3">
                  <label className="text-xs font-medium text-[#f4e2b8] block">
                    Degradados de Alta Precisión
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { name: 'Obsidiana Profundo', val: 'radial-gradient(circle at top, #15271d 0%, #050806 80%)' },
                      { name: 'Aurora Esmeralda', val: 'linear-gradient(135deg, #021b18 0%, #042921 50%, #010d0b 100%)' },
                      { name: 'Midnight Violet', val: 'radial-gradient(circle at top right, #240b36 0%, #080512 70%)' },
                      { name: 'Onyx Negro Puro', val: 'linear-gradient(180deg, #0e0e0e 0%, #000000 100%)' },
                    ].map((grad) => (
                      <button
                        key={grad.name}
                        onClick={() => onUpdateCustomization({ bgGradient: grad.val })}
                        className="h-16 rounded-xl border border-white/20 p-2 text-left text-[11px] font-semibold text-white transition-transform hover:scale-105 shadow-md flex items-end"
                        style={{ background: grad.val }}
                      >
                        {grad.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image / Wallpaper Picker */}
              {customization.bgType === 'image' && (
                <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-4 space-y-4">
                  {/* Upload custom image */}
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/20 px-4 py-2 text-xs font-medium text-[#f4e2b8] hover:bg-[#c5a059]/35 transition-colors shadow-sm"
                    >
                      <Upload className="h-4 w-4 text-[#c5a059]" />
                      <span>Subir Imagen Desde Mi Equipo</span>
                    </button>
                    <span className="text-xs text-[#8e9c8c]">O selecciona un wallpaper curado:</span>
                  </div>

                  {/* Wallpaper Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {CURATED_WALLPAPERS.map((wp) => (
                      <button
                        key={wp.name}
                        onClick={() => onUpdateCustomization({ bgType: 'image', bgImage: wp.url })}
                        className="group relative h-24 overflow-hidden rounded-xl border border-white/20 shadow-md transition-all hover:scale-105"
                      >
                        <img src={wp.url} alt={wp.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[11px] font-medium text-white">{wp.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Image Adjustments */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-white/10">
                    <div>
                      <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                        <span>Desenfoque del fondo (Blur)</span>
                        <span className="font-mono-code">{customization.bgImageBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={customization.bgImageBlur}
                        onChange={(e) =>
                          onUpdateCustomization({ bgImageBlur: parseInt(e.target.value, 10) })
                        }
                        className="w-full accent-[#c5a059]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                        <span>Opacidad del fondo</span>
                        <span className="font-mono-code">{Math.round(customization.bgImageOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={customization.bgImageOpacity}
                        onChange={(e) =>
                          onUpdateCustomization({ bgImageOpacity: parseFloat(e.target.value) })
                        }
                        className="w-full accent-[#c5a059]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHAT BUBBLES */}
          {activeTab === 'bubbles' && (
            <div className="space-y-6">
              {/* User Bubble Settings */}
              <div className="rounded-2xl border border-[#c5a059]/25 bg-[#0e1913]/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-luxury text-sm font-bold text-[#f4e2b8]">
                    Globo de Mensaje del Usuario
                  </h4>
                  {/* Live Mini Preview */}
                  <div
                    className="px-4 py-2 text-xs font-semibold shadow-lg"
                    style={{
                      background: customization.userBubbleGradient,
                      color: customization.userBubbleTextColor,
                      borderRadius: `${customization.userBubbleRadius}px`,
                    }}
                  >
                    HOLA APS
                  </div>
                </div>

                {/* Preset gradients for user bubble */}
                <div>
                  <span className="text-xs text-[#a7b3a5] block mb-2">Gradientes de Ejemplo:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'linear-gradient(135deg, #0984e3 0%, #00cec9 100%)',
                      'linear-gradient(135deg, #2d553e 0%, #193224 100%)',
                      'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                      'linear-gradient(135deg, #d63031 0%, #e17055 100%)',
                      'linear-gradient(135deg, #1e272e 0%, #485460 100%)',
                    ].map((grad, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdateCustomization({ userBubbleGradient: grad })}
                        className="h-7 w-12 rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-105"
                        style={{ background: grad }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[#a7b3a5] block mb-1">Color del Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.userBubbleTextColor}
                        onChange={(e) => onUpdateCustomization({ userBubbleTextColor: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-[#c5a059]/20 bg-transparent p-1"
                      />
                      <span className="font-mono-code text-xs text-[#fbf5e8]">
                        {customization.userBubbleTextColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                      <span>Curvatura (Radio)</span>
                      <span className="font-mono-code">{customization.userBubbleRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="40"
                      value={customization.userBubbleRadius}
                      onChange={(e) =>
                        onUpdateCustomization({ userBubbleRadius: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-[#c5a059]"
                    />
                  </div>
                </div>
              </div>

              {/* Model Bubble Settings */}
              <div className="rounded-2xl border border-[#c5a059]/25 bg-[#0e1913]/70 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif-luxury text-sm font-bold text-[#f4e2b8]">
                    Globo de Mensaje de APS (IA)
                  </h4>
                  {/* Live Mini Preview */}
                  <div
                    className="px-4 py-2 text-xs font-semibold shadow-lg"
                    style={{
                      background: customization.modelBubbleGradient,
                      color: customization.modelBubbleTextColor,
                      borderRadius: `${customization.modelBubbleRadius}px`,
                    }}
                  >
                    HOLA, ¿EN QUÉ PUEDO AYUDARTE HOY?
                  </div>
                </div>

                {/* Preset gradients for model bubble */}
                <div>
                  <span className="text-xs text-[#a7b3a5] block mb-2">Gradientes de Ejemplo:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'linear-gradient(135deg, #ff7675 0%, #e17055 100%)',
                      'linear-gradient(135deg, #1b261e 0%, #0f1611 100%)',
                      'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                      'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
                      'linear-gradient(135deg, #2d3436 0%, #636e72 100%)',
                    ].map((grad, i) => (
                      <button
                        key={i}
                        onClick={() => onUpdateCustomization({ modelBubbleGradient: grad })}
                        className="h-7 w-12 rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-105"
                        style={{ background: grad }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-[#a7b3a5] block mb-1">Color del Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.modelBubbleTextColor}
                        onChange={(e) => onUpdateCustomization({ modelBubbleTextColor: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-[#c5a059]/20 bg-transparent p-1"
                      />
                      <span className="font-mono-code text-xs text-[#fbf5e8]">
                        {customization.modelBubbleTextColor}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                      <span>Curvatura (Radio)</span>
                      <span className="font-mono-code">{customization.modelBubbleRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="40"
                      value={customization.modelBubbleRadius}
                      onChange={(e) =>
                        onUpdateCustomization({ modelBubbleRadius: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-[#c5a059]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIQUID GLASS PHYSICS */}
          {activeTab === 'glass' && (
            <div className="space-y-5 rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-5">
              <h4 className="font-serif-luxury text-sm font-bold text-[#f4e2b8]">
                Parámetros de Refracción & Cristal Líquido Real
              </h4>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                    <span>Backdrop Blur (Desenfoque Vítreo)</span>
                    <span className="font-mono-code">{customization.glassBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="45"
                    value={customization.glassBlur}
                    onChange={(e) =>
                      onUpdateCustomization({ glassBlur: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-[#c5a059]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#a7b3a5] mb-1">
                    <span>Densidad / Opacidad del Cristal</span>
                    <span className="font-mono-code">{Math.round(customization.glassOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="0.95"
                    step="0.05"
                    value={customization.glassOpacity}
                    onChange={(e) =>
                      onUpdateCustomization({ glassOpacity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#c5a059]"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <div>
                    <span className="text-xs font-medium text-[#fbf5e8] block">
                      Destello Especular Dinámico (Reflejo 3D)
                    </span>
                    <span className="text-[11px] text-[#8e9c8c]">
                      El halo de luz reacciona y sigue el movimiento de tu cursor en tiempo real.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customization.glassSpecularGlow}
                    onChange={(e) =>
                      onUpdateCustomization({ glassSpecularGlow: e.target.checked })
                    }
                    className="h-4 w-4 accent-[#c5a059] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONTROLS & BARS */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Input Bar Gradient */}
              <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-5 space-y-3">
                <h4 className="font-serif-luxury text-sm font-bold text-[#f4e2b8]">
                  Barra Flotante de Escritura ('DESCRIBE TU IDEA')
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'linear-gradient(90deg, #6c5ce7 0%, #0984e3 45%, #00b894 100%)',
                    'linear-gradient(90deg, #1f392b 0%, #15241b 100%)',
                    'linear-gradient(90deg, #8e44ad 0%, #3498db 100%)',
                    'linear-gradient(90deg, #d63031 0%, #fdcb6e 100%)',
                  ].map((grad, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdateCustomization({ inputBarGradient: grad })}
                      className="h-8 w-24 rounded-lg border border-white/20 shadow transition-transform hover:scale-105"
                      style={{ background: grad }}
                    />
                  ))}
                </div>
              </div>

              {/* Model Selector Card Gradient */}
              <div className="rounded-2xl border border-[#c5a059]/20 bg-[#0e1913]/70 p-5 space-y-3">
                <h4 className="font-serif-luxury text-sm font-bold text-[#f4e2b8]">
                  Tarjeta del Selector 'MODELO APS...'
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'linear-gradient(135deg, #6c5ce7 0%, #0984e3 40%, #00b894 100%)',
                    'linear-gradient(135deg, #8a6829 0%, #c5a059 50%, #2e5c46 100%)',
                    'linear-gradient(135deg, #9b59b6 0%, #3498db 100%)',
                    'linear-gradient(135deg, #e17055 0%, #d63031 100%)',
                  ].map((grad, i) => (
                    <button
                      key={i}
                      onClick={() => onUpdateCustomization({ modelSelectorGradient: grad })}
                      className="h-8 w-24 rounded-lg border border-white/20 shadow transition-transform hover:scale-105"
                      style={{ background: grad }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#c5a059]/20 bg-[#0e1a14]/90 px-6 py-4">
          <span className="text-xs text-[#8e9c8c]">
            Tus cambios se guardan automáticamente en tu navegador.
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#c5a059]/50 bg-gradient-to-r from-[#c5a059] to-[#d8b66f] px-6 py-2 text-xs font-serif-luxury font-bold text-[#070c09] shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            Guardar & Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
