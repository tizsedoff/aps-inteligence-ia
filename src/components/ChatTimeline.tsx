import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, ApsModelId, InteractionMode, VisualCustomization, UserAccount } from '../types';
import { ThinkingDrawer } from './ThinkingDrawer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ApsLogo } from './ApsLogo';
import { AssistantPending, RevealImage } from './LoadingStates';
import {
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  FileText,
  Maximize2,
  Download,
  X,
  Clock,
  Code2,
  Smile,
  Briefcase,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatTimelineProps {
  messages: ChatMessage[];
  currentModel: ApsModelId;
  interactionMode: InteractionMode;
  customization: VisualCustomization;
  currentUser: UserAccount | null;
  onSelectPrompt: (prompt: string) => void;
  onSendToCli: (code: string, language: string) => void;
  onRetry?: (messageId: string) => void;
  isLoading: boolean;
}

export const ChatTimeline: React.FC<ChatTimelineProps> = ({
  messages,
  currentModel,
  interactionMode,
  customization,
  currentUser,
  onSelectPrompt,
  onSendToCli,
  onRetry,
  isLoading,
}) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
      } else {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[*#`_~]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.onend = () => setSpeakingId(null);
        utterance.onerror = () => setSpeakingId(null);
        window.speechSynthesis.speak(utterance);
        setSpeakingId(id);
      }
    }
  };

  const displayName = currentUser?.name ? currentUser.name.toUpperCase() : '(NOMBRE)';

  // Dynamic prompts tailored to the active Interaction Mode
  const getSampleIdeas = () => {
    switch (interactionMode) {
      case 'code':
        return [
          { title: 'Microservicio Resiliente', prompt: 'Diseña la arquitectura de un microservicio en TypeScript con Redis y colas de mensajes.' },
          { title: 'Optimización de Algoritmo', prompt: 'Implementa un algoritmo de compresión y búsqueda binaria de alta velocidad.' },
          { title: 'Auditoría de Seguridad', prompt: 'Escribe un middleware estricto con validación de tokens JWT, rate limiting y CORS.' },
          { title: 'Tests Unitarios & Mocks', prompt: 'Escribe suites de tests unitarios exhaustivos con cobertura completa para esta API.' },
        ];
      case 'teens':
        return [
          { title: 'Crear un Juego Divertido', prompt: 'Dame una idea y el código para un mini-juego en JavaScript súper divertido y adictivo.' },
          { title: 'Explicar Tema Escolar Fácil', prompt: 'Explícame la física cuántica o la mitosis con ejemplos de videojuegos y memes que entienda ya.' },
          { title: 'Idea para Proyecto o Video', prompt: 'Dame 5 ideas originales para crear una app o contenido viral en redes que nadie haya hecho.' },
          { title: 'Aprender a Programar', prompt: 'Quiero empezar a programar desde cero sin aburrirme, ¿cuál es el mejor camino paso a paso?' },
        ];
      case 'adults':
      default:
        return [
          { title: 'Estrategia de Crecimiento', prompt: 'Estructura un plan trimestral de optimización de costos, ROI y asignación de presupuesto.' },
          { title: 'Análisis de Cartera & Finanzas', prompt: 'Modela una estrategia diversificada de activos con proyección de rendimiento compuesto.' },
          { title: 'Propuesta Corporativa', prompt: 'Redacta una propuesta de negocio ejecutiva y persuasiva para clientes de alto valor.' },
          { title: 'Sistema de Productividad', prompt: 'Diseña un sistema de trabajo por bloques de tiempo enfocado en metas estratégicas OKR.' },
        ];
    }
  };

  const sampleIdeas = getSampleIdeas();

  return (
    <div className="flex-1 overflow-y-auto px-2.5 sm:px-4 py-4 sm:py-6 md:px-8">
      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        {/* EMPTY STATE — Exactly as shown in Reference Mockup J.png */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-[55vh] sm:min-h-[60vh] flex-col items-center justify-center text-center space-y-3 sm:space-y-4 px-2"
          >
            {/* APS Logo in larger space */}
            <div className="mb-2">
              <ApsLogo variant="full" glow size={56} className="mx-auto" />
            </div>

            {/* HOLA (NOMBRE) */}
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-wider bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--accent-2)] to-[color:var(--accent-2-soft)] bg-clip-text text-transparent drop-shadow-[0_0_25px_color-mix(in_srgb,var(--accent)_40%,transparent)]">
              HOLA <span className="text-[color:var(--accent-2-soft)]">{displayName}</span>
            </h1>

            {/* DIME TU IDEA Y LA HACEMOS REALIDAD */}
            <h2 className="text-lg sm:text-xl md:text-3xl font-extrabold italic tracking-wide text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              DIME TU <span className="text-[color:var(--accent)]">IDEA</span> Y LA HACEMOS REALIDAD
            </h2>

            <p className="max-w-md text-xs md:text-sm text-[color:var(--text-secondary)] pt-1 sm:pt-2">
              Modelos de alta inferencia APS con procesamiento de archivos, generación de código en tiempo real y pensamiento extendido.
            </p>

            {/* Quick Idea Starters */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 pt-4 sm:pt-6 max-w-2xl">
              {sampleIdeas.map((idea) => (
                <button
                  key={idea.title}
                  onClick={() => onSelectPrompt(idea.prompt)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium text-[color:var(--text-primary)] hover:border-[color:var(--accent)]/60 hover:bg-[color:var(--accent)]/15 hover:scale-105 active:scale-95 transition-all shadow-md backdrop-blur-md"
                >
                  <span className="text-[color:var(--accent)] font-bold mr-1">✦</span>
                  {idea.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* MESSAGES LIST — Styled according to user customization & Mockup i.png */}
        <AnimatePresence initial={false}>
          {messages.map((msg, msgIdx) => {
            const isLastMessage = msgIdx === messages.length - 1;
            const isPending =
              isLoading &&
              isLastMessage &&
              !msg.content &&
              !(msg.images && msg.images.length > 0) &&
              !msg.error &&
              !msg.isThinkingActive;
            const isImageError = Boolean(messages[msgIdx - 1]?.isImageRequest);
            const errorText = msg.content.replace(/^\[Error:\s*/, '').replace(/\]$/, '');
            const isDemandError = /503|alta demanda|high demand|UNAVAILABLE/i.test(errorText);
            const errorTitle = isDemandError
              ? 'Alta demanda en este momento'
              : isImageError
              ? 'No se pudo crear la imagen'
              : 'No se pudo completar la respuesta';
            return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* USER MESSAGE BUBBLE */}
              {msg.role === 'user' ? (
                <div className="max-w-[88%] sm:max-w-[75%] space-y-2">
                  {/* Attachments if any */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2 mb-1.5">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="relative overflow-hidden rounded-xl border border-white/20 bg-black/60 shadow-md group cursor-pointer"
                          onClick={() => att.previewUrl && setSelectedImage(att.previewUrl)}
                        >
                          {att.previewUrl ? (
                            <div className="relative">
                              <img
                                src={att.previewUrl}
                                alt={att.name}
                                className="h-24 w-24 sm:h-28 sm:w-28 object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 sm:p-2.5 text-xs text-white">
                              <FileText className="h-4 w-4 text-[color:var(--accent)]" />
                              <span className="max-w-[100px] sm:max-w-[120px] truncate">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bubble body with customizable gradient, radius, text color */}
                  <div
                    className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-sm md:text-base font-semibold leading-relaxed shadow-2xl backdrop-blur-xl border border-white/15"
                    style={{
                      background: customization.userBubbleGradient,
                      color: customization.userBubbleTextColor,
                      borderRadius: `${customization.userBubbleRadius}px`,
                      boxShadow: customization.userBubbleShadow
                        ? '0 12px 28px -6px rgba(0, 0, 0, 0.65)'
                        : 'none',
                    }}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  <div className="flex items-center justify-end gap-1 px-1 text-[10px] font-mono-code text-[color:var(--text-muted)]">
                    <Clock className="h-2.5 w-2.5" />
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                /* MODEL MESSAGE BUBBLE */
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 px-1 flex-wrap">
                    <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg border border-white/20 bg-[color:var(--surface-3)] text-[9px] sm:text-[10px] font-serif-luxury font-bold text-[color:var(--accent-soft)] shadow">
                      APS
                    </div>
                    <span className="font-serif-luxury text-[11px] sm:text-xs font-semibold tracking-wider text-[color:var(--accent-soft)]">
                      {msg.model || currentModel}
                    </span>
                    <span className="rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 px-2 py-0.5 text-[8px] sm:text-[9px] font-mono-code uppercase tracking-wider text-[color:var(--accent)]">
                      {msg.mode === 'code' ? 'Código' : msg.mode === 'teens' ? 'Teens' : 'Adultos'}
                    </span>
                    <span className="text-[10px] font-mono-code text-[color:var(--text-muted)]">
                      ·{' '}
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Model Bubble Container with customizable gradient & liquid glass real */}
                  <div
                    className="relative overflow-hidden p-3.5 sm:p-5 shadow-2xl backdrop-blur-2xl border border-white/15"
                    style={{
                      background: customization.modelBubbleGradient,
                      color: customization.modelBubbleTextColor,
                      borderRadius: `${customization.modelBubbleRadius}px`,
                      boxShadow: customization.modelBubbleShadow
                        ? '0 16px 36px -8px rgba(0, 0, 0, 0.7)'
                        : 'none',
                    }}
                  >
                    {/* Top liquid reflection edge */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    {/* Extended Thinking Drawer */}
                    {(msg.thinking || msg.isThinkingActive) && (
                      <ThinkingDrawer
                        thinking={msg.thinking || ''}
                        isActive={msg.isThinkingActive}
                        durationMs={msg.durationMs}
                      />
                    )}

                    {/* Content or Error Alert */}
                    {msg.error ? (
                      <div
                        role="alert"
                        className="rounded-2xl border border-red-500/35 bg-gradient-to-b from-red-500/10 to-black/50 p-4 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold block text-red-300 text-sm">{errorTitle}</span>
                            <p className="text-white/85 leading-relaxed text-xs mt-1 break-words">
                              {errorText}
                            </p>
                          </div>
                        </div>

                        {onRetry && (
                          <button
                            onClick={() => onRetry(msg.id)}
                            className="flex items-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)] px-4 py-2 text-xs font-bold text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
                          >
                            <RefreshCw className="h-4 w-4" />
                            <span>Reintentar</span>
                          </button>
                        )}
                      </div>
                    ) : msg.content ? (
                      <MarkdownRenderer content={msg.content} onSendToCli={onSendToCli} />
                    ) : isPending ? (
                      <AssistantPending kind={msg.isImageGeneration ? 'image' : 'text'} />
                    ) : null}

                    {/* Generated images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {msg.images.map((img, idx) => {
                          const src = `data:${img.mimeType};base64,${img.data}`;
                          const ext = img.mimeType.split('/')[1] || 'png';
                          return (
                            <div
                              key={idx}
                              className="group relative overflow-hidden rounded-2xl border border-white/20 shadow-xl"
                            >
                              <RevealImage
                                src={src}
                                alt="Imagen generada por APS"
                                onClick={() => setSelectedImage(src)}
                              />
                              <a
                                href={src}
                                download={`aps-imagen-${msg.id}-${idx + 1}.${ext}`}
                                className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white opacity-90 backdrop-blur hover:bg-black/90 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                title="Descargar imagen"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Descargar</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    {msg.content && (
                      <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
                            title="Copiar respuesta"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            className={`flex items-center gap-1 transition-colors ${
                              speakingId === msg.id ? 'text-[color:var(--accent)]' : 'text-white/80 hover:text-white'
                            }`}
                            title="Lectura en voz alta"
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="h-3.5 w-3.5 text-[color:var(--accent)]" />
                                <span>Silenciar</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>Escuchar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {msg.durationMs && (
                          <span className="font-mono-code text-[10px] text-white/70">
                            {(msg.durationMs / 1000).toFixed(2)}s de cómputo
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={endRef} />
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-white/20 bg-black p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={selectedImage}
                alt="Vista previa"
                className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
