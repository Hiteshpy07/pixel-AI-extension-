import React from "react";
import { Sparkles, Cpu, Terminal } from "lucide-react";

export default function Header({ activeMode, setActiveMode, backendStatus }) {
  return (
    <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/20">
          <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">PIXEL AI</h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Vision & OCR Studio
            </span>
          </div>
          <p className="text-xs text-zinc-400">Intelligent Screen Companion & Code Assistant</p>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-white/10 shadow-inner">
        <button
          onClick={() => setActiveMode("vision")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMode === "vision"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gemini Vision
        </button>

        <button
          onClick={() => setActiveMode("code")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMode === "code"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Screen-to-Code
        </button>

        <button
          onClick={() => setActiveMode("ocr")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeMode === "ocr"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          EasyOCR (Local)
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-1.5 rounded-xl border border-white/10 shadow-sm">
          <span className={`w-2 h-2 rounded-full ${backendStatus ? "bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" : "bg-rose-500"}`} />
          <span className="text-zinc-300 font-mono text-[11px]">
            {backendStatus ? "FastAPI :5001 Live" : "Backend Offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
