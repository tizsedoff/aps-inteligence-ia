import React, { useRef, useState, useEffect } from 'react';
import { ApsModelId, InteractionMode, Attachment, VisualCustomization } from '../types';
import { ApsLogo } from './ApsLogo';
import {
  Image as ImageIcon,
  FileText,
  X,
  Brain,
  StopCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InputDockProps {
  currentModel: ApsModelId;
  interactionMode?: InteractionMode;
  customization: VisualCustomization;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
}

export const InputDock: React.FC<InputDockProps> = ({
  currentModel,
  interactionMode = 'code',
  customization,
  extendedThinking,
  onToggleExtendedThinking,
  onSendMessage,
  isLoading,
  onStopGeneration,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');

      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || '';

        const newAttachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data: base64Data,
          mimeType: file.type || 'application/octet-stream',
          previewUrl: isImage ? result : undefined,
        };

        setAttachments((prev) => [...prev, newAttachment]);
      };

      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 sm:pt-2">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.js,.ts,.tsx,.jsx,.py,.json,.csv,.md,.html"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Liquid Glass Bar matching Mockup J.png / i.png */}
      <motion.div
        animate={{
          boxShadow: isFocused
            ? '0 20px 45px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 206, 201, 0.3)'
            : '0 16px 36px -10px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative overflow-hidden rounded-full border border-white/20 transition-all duration-300 backdrop-blur-2xl p-1 sm:p-1.5"
        style={{
          background: customization.inputBarGradient,
        }}
      >
        {/* Specular fluid light highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Attachment Tray if files attached */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 px-3 sm:px-4 py-1.5 border-b border-white/10 mb-1"
            >
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-2.5 py-1 text-xs text-white shadow-md"
                >
                  {att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-[#00cec9]" />
                  )}
                  <span className="truncate max-w-[100px] sm:max-w-[120px] font-mono-code text-[11px]">
                    {att.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-white/20 text-white/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Mockup Pill Bar: Image Button | Divider | Textarea | Send Button */}
        <div className="flex items-center gap-2 sm:gap-3 px-1.5 sm:px-2 py-0.5 sm:py-1">
          {/* Left: Image/File Upload Icon Button (Gray rounded square as in mockup) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-black/35 text-white/90 hover:bg-black/50 hover:scale-105 active:scale-95 transition-all shadow-inner border border-white/15"
            title="Subir foto o archivo para procesamiento"
          >
            <ImageIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </button>

          {/* Thin vertical divider line */}
          <div className="h-6 sm:h-7 w-px bg-white/30 shrink-0" />

          {/* Center: Textarea with DESCRIBE TU IDEA */}
          <div className="flex flex-1 items-center min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="DESCRIBE TU IDEA"
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] sm:text-base font-extrabold uppercase tracking-wide text-white placeholder-white/70 focus:outline-none placeholder:font-extrabold"
            />
          </div>

          {/* Extended Thinking Quick Indicator Toggle */}
          <button
            onClick={onToggleExtendedThinking}
            className={`hidden md:flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-all ${
              extendedThinking || currentModel === 'APS HARD WORK'
                ? 'bg-black/50 text-[#00cec9] border border-[#00cec9]/40 shadow-[0_0_10px_rgba(0,206,201,0.3)]'
                : 'bg-black/25 text-white/70 hover:text-white'
            }`}
            title="Activar Pensamiento Extendido"
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="text-[10px]">Pensamiento</span>
          </button>

          {/* Right: Send Button with Compact APS Logo replacing the arrow */}
          {isLoading ? (
            <button
              onClick={onStopGeneration}
              className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-red-600/90 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all"
              title="Detener generación"
            >
              <StopCircle className="h-5 w-5 animate-spin" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!text.trim() && attachments.length === 0}
              className={`group relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-300 p-2 overflow-hidden ${
                text.trim() || attachments.length > 0
                  ? 'border border-[#00cec9]/80 bg-gradient-to-b from-[#0e2a24]/90 to-[#03130e]/95 hover:border-[#00cec9] hover:from-[#133d34] hover:to-[#061e16] hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,206,201,0.55)] cursor-pointer'
                  : 'border border-white/15 bg-white/5 opacity-80 hover:opacity-100 hover:border-white/30 cursor-pointer'
              }`}
              title="Enviar idea (APS)"
            >
              {/* Radial glow background when ready to send */}
              {(text.trim() || attachments.length > 0) && (
                <div className="absolute inset-0 bg-radial from-[#00cec9]/30 via-transparent to-transparent pointer-events-none" />
              )}
              <ApsLogo
                variant="compact"
                glow={Boolean(text.trim() || attachments.length > 0)}
                className={`relative z-10 h-full w-full object-contain transition-all duration-300 ${
                  text.trim() || attachments.length > 0
                    ? 'scale-105 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(0,206,201,0.8)]'
                    : 'opacity-90 group-hover:opacity-100'
                }`}
              />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
