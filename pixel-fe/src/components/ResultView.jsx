import React, { useState } from "react";
import { Copy, Check, Terminal, Sparkles, MessageSquare } from "lucide-react";

export default function ResultView({ resultText, isStreaming, onFollowUp, activeMode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickPrompts = [
    { label: "💡 Fix this bug", prompt: "Explain what is causing the error in this screenshot and provide the exact fix code." },
    { label: "⚡ Convert to TypeScript", prompt: "Convert the code shown in this screenshot into type-safe TypeScript." },
    { label: "🚀 Optimize Code", prompt: "Suggest performance and clean code optimizations for this snippet." },
    { label: "📝 Summarize Step-by-Step", prompt: "Give me a concise 3-bullet-point summary of what is happening here." },
  ];

  const renderFormattedContent = (content) => {
    if (!content) return null;

    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeLines = part.slice(3, -3).trim().split("\n");
        const language = codeLines[0].trim();
        const isLang = /^[a-zA-Z0-9_-]+$/.test(language);
        const code = (isLang ? codeLines.slice(1) : codeLines).join("\n");

        return (
          <div key={index} className="my-3 rounded-xl overflow-hidden border border-white/10 bg-zinc-950/90 shadow-lg">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-white/5 text-[11px] text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>{language || "code"}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-purple-200/90 overflow-x-auto leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-zinc-200 text-xs my-1">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-3 relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              {activeMode === "ocr" ? "Extracted Text (EasyOCR)" : activeMode === "code" ? "Generated Component" : "AI Analysis & Insights"}
            </h2>
            {isStreaming && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full animate-pulse border border-purple-500/30">
                Streaming Tokens...
              </span>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy All"}</span>
          </button>
        </div>

        <div className="min-h-[160px] max-h-[480px] overflow-y-auto pr-1 text-xs">
          {resultText ? (
            renderFormattedContent(resultText)
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500 text-center gap-2">
              <Sparkles className="w-6 h-6 text-zinc-600" />
              <p className="text-xs">Upload or crop a screen to start the AI analysis.</p>
            </div>
          )}
        </div>

        {resultText && !isStreaming && (
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              Quick Follow-ups:
            </span>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onFollowUp(item.prompt)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-purple-600/20 hover:text-purple-300 hover:border-purple-500/30 border border-white/5 text-zinc-300 text-xs font-medium transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
