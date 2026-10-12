import React, { useState } from 'react';
import { marked } from 'marked';
import { Check, Copy, Terminal, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  onSendToCli?: (code: string, language: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onSendToCli }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Parse custom code blocks to give them liquid glass luxury chrome
  const renderFormattedContent = () => {
    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        const rawHtml = marked.parse(textBefore, { breaks: true, gfm: true }) as string;
        parts.push(
          <div
            key={`text-${lastIndex}`}
            className="prose prose-invert max-w-none space-y-3 leading-relaxed text-[#d9ded7] prose-headings:font-serif-luxury prose-headings:text-[#f4e2b8] prose-a:text-[#c5a059] prose-strong:text-[#f7e7ce] prose-code:font-mono-code prose-code:text-[#d8b66f] prose-code:bg-[#c5a059]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
            dangerouslySetInnerHTML={{ __html: rawHtml }}
          />
        );
      }

      const lang = match[1] || 'plaintext';
      const code = match[2];
      const currentBlockIdx = blockIndex;

      const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(currentBlockIdx);
        setTimeout(() => setCopiedIndex(null), 2000);
      };

      parts.push(
        <div
          key={`code-${match.index}`}
          className="my-4 overflow-hidden rounded-xl border border-[#c5a059]/25 bg-[#070d09]/90 shadow-2xl backdrop-blur-xl"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[#c5a059]/15 bg-[#0d1611]/80 px-4 py-2 text-xs font-mono-code">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#c5a059]" />
              <span className="uppercase tracking-wider text-[#c5a059] font-medium">{lang}</span>
            </div>
            <div className="flex items-center gap-2">
              {onSendToCli && (
                <button
                  onClick={() => onSendToCli(code, lang)}
                  className="flex items-center gap-1.5 rounded-md border border-[#c5a059]/30 bg-[#c5a059]/10 px-2.5 py-1 text-xs text-[#f4e2b8] transition-colors hover:bg-[#c5a059]/20 hover:text-white"
                  title="Abrir en la consola CLI de APS Hard Work"
                >
                  <Terminal className="h-3.5 w-3.5 text-[#c5a059]" />
                  <span>Cargar en CLI</span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[#a7b3a5] transition-colors hover:bg-white/10 hover:text-white"
              >
                {copiedIndex === currentBlockIdx ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Body */}
          <pre className="overflow-x-auto p-4 text-xs md:text-sm font-mono-code leading-relaxed text-[#e0e7df]">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
      blockIndex++;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText.trim()) {
      const rawHtml = marked.parse(remainingText, { breaks: true, gfm: true }) as string;
      parts.push(
        <div
          key={`text-${lastIndex}`}
          className="prose prose-invert max-w-none space-y-3 leading-relaxed text-[#d9ded7] prose-headings:font-serif-luxury prose-headings:text-[#f4e2b8] prose-a:text-[#c5a059] prose-strong:text-[#f7e7ce] prose-code:font-mono-code prose-code:text-[#d8b66f] prose-code:bg-[#c5a059]/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
          dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
      );
    }

    return parts;
  };

  return <div className="space-y-3">{renderFormattedContent()}</div>;
};
