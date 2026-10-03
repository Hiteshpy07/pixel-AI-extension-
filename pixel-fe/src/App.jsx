import React, { useState } from "react";
import FloatingPixelAssistant from "./components/FloatingPixelAssistant";
import { Sparkles, Terminal, Code2, Globe, Laptop, ArrowUpRight } from "lucide-react";

export default function App() {
  const [demoPage, setDemoPage] = useState("code"); // "code" | "web"

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200 relative overflow-hidden">
      {/* Top Demo Bar (Simulating Browser Tab / Webpage Environment) */}
      <nav className="w-full bg-zinc-900/60 border-b border-white/5 px-6 py-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="bg-zinc-950/80 border border-white/10 px-4 py-1 rounded-full text-xs font-mono text-zinc-400 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span>https://developer.mozilla.org/en-US/docs/Web/JavaScript</span>
          </div>
        </div>

        {/* Demo Content Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Simulate Tab:</span>
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setDemoPage("code")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                demoPage === "code" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Code Editor Tab
            </button>
            <button
              onClick={() => setDemoPage("web")}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                demoPage === "web" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Web Documentation Tab
            </button>
          </div>
        </div>
      </nav>

      {/* Simulated Page Content (Shows how Pixel floats on ANY page) */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
        {demoPage === "code" ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span>src/services/authService.ts</span>
              </div>
              <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-mono">
                Error on Line 14: TypeError
              </span>
            </div>

            <pre className="font-mono text-xs leading-relaxed text-zinc-300 p-4 bg-zinc-950/80 rounded-xl overflow-x-auto border border-white/5">
              <code>{`// Example buggy code to test Pixel with:
import { createClient } from '@supabase/supabase-js';

export async function authenticateUser(token: string) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // Line 14 - Potential Null Reference
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) {
    throw new Error(error.message);
  }

  // Bug: user might be undefined if session is expired
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata.role
  };
}`}</code>
            </pre>

            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-purple-200">How to test:</strong> Look at the <strong>bottom-left</strong> of your screen! Click the glowing Pixel avatar (or press <kbd className="px-1.5 py-0.5 bg-zinc-900 rounded font-mono text-white text-[10px]">Alt+S</kbd>), snip this code block, and Pixel will instantly stream the bug explanation and fixed TypeScript code into the popup!
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Understanding Asynchronous JavaScript & Promises
              </h1>
              <p className="text-sm text-zinc-400">
                A modern guide to event loops, microtasks, and async/await orchestration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2">Microtask Queue</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Promises and MutationObserver callbacks run in the microtask queue, which executes immediately after the current script and before the next task or render frame.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2">Macrotask Queue</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  setTimeout, setInterval, and requestAnimationFrame run in macrotasks. The event loop prioritizes emptying microtasks before picking the next macrotask.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-indigo-200">Try OCR Mode:</strong> Open Pixel in the bottom-left, switch mode to <strong>OCR</strong>, and snip this article. EasyOCR will extract the text verbatim with an AI executive summary!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* THE FLOATING PIXEL ASSISTANT IN BOTTOM-LEFT */}
      <FloatingPixelAssistant isExtension={false} />
    </div>
  );
}
