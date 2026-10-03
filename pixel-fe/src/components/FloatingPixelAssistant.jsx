import React, { useState, useRef, useEffect } from "react";
import SelectionOverlay from "../SelectionOverlay";
import {
  Sparkles,
  Terminal,
  Cpu,
  Camera,
  MessageSquare,
  Send,
  X,
  Minus,
  RotateCcw,
  Copy,
  Check,
  Zap,
  ChevronRight,
  Maximize2,
  Trash2,
  AlertCircle,
  HelpCircle,
  Move
} from "lucide-react";

export default function FloatingPixelAssistant({ isExtension = false }) {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeMode, setActiveMode] = useState("vision"); // "vision" | "code" | "ocr"
  const [activeTab, setActiveTab] = useState("result"); // "result" | "chat"
  const [showOverlay, setShowOverlay] = useState(false);
  const [backendStatus, setBackendStatus] = useState(false);

  // Content State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Position & Drag State (Relative offset from bottom-left)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });
  const chatBottomRef = useRef(null);
  const popupRef = useRef(null);

  // Check FastAPI backend health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:5001/health");
        setBackendStatus(res.ok);
      } catch (err) {
        setBackendStatus(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener: Alt+S to trigger snip, Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setShowOverlay(true);
      } else if (e.key === "Escape" && isOpen && !showOverlay) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showOverlay]);

  // Chrome Extension message listener (toggle from toolbar, etc.)
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      const handleRuntimeMessage = (message, sender, sendResponse) => {
        if (message.type === "PIXEL_TOGGLE_POPUP") {
          setIsOpen((prev) => !prev);
          setIsMinimized(false);
          sendResponse({ success: true });
        } else if (message.type === "PIXEL_START_SELECTION") {
          setShowOverlay(true);
          sendResponse({ success: true });
        }
        return true;
      };

      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      };
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatLoading, activeTab]);

  // Dragging logic for floating avatar
  const handleMouseDown = (e) => {
    // Only drag from avatar or header drag handle
    setIsDragging(true);
    dragRef.current.startX = e.clientX - position.x;
    dragRef.current.startY = e.clientY - position.y;
    dragRef.current.hasMoved = false;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      dragRef.current.hasMoved = true;
      // Clamp within viewport
      const newX = e.clientX - dragRef.current.startX;
      const newY = e.clientY - dragRef.current.startY;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  // Handle screenshot crop received
  const handleImageReady = (rawBase64) => {
    const fullDataUrl = `data:image/png;base64,${rawBase64}`;
    setSelectedImage(fullDataUrl);
    setShowOverlay(false);
    setIsOpen(true);
    setIsMinimized(false);

    // Get image dimensions for badge
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = fullDataUrl;

    // Immediately trigger analysis
    runAnalysis(fullDataUrl);
  };

  // Run AI Analysis or OCR
  const runAnalysis = async (imageData = selectedImage, promptOverride = null) => {
    if (!imageData) return;

    setIsLoading(true);
    setIsStreaming(true);
    setResultText("");
    setActiveTab("result");

    const promptToSend =
      promptOverride ||
      customPrompt ||
      (activeMode === "code"
        ? "Convert this screenshot design or code into clean, modern, fully functional code (React + Tailwind CSS if UI). Explain key fixes and decisions."
        : activeMode === "ocr"
        ? "Extract all text verbatim with highest accuracy."
        : "Analyze this screenshot in detail. Identify any UI components, data, code, or errors, and provide clear actionable insights and fixes.");

    try {
      if (activeMode === "ocr") {
        const response = await fetch("http://localhost:5001/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData, with_ai_summary: true }),
        });
        const data = await response.json();
        const output = data.summary
          ? `### 📝 Extracted Text:\n\n${data.text}\n\n---\n### 🤖 AI Summary & Key Takeaways:\n${data.summary}`
          : data.text || "No text detected in this selection.";
        setResultText(output);
        setChatMessages([{ role: "model", text: output }]);
      } else {
        const response = await fetch("http://localhost:5001/stream-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: imageData,
            prompt: promptToSend,
            mode: activeMode,
          }),
        });

        if (!response.body) throw new Error("No stream body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setResultText(accumulated);
        }

        setChatMessages([{ role: "model", text: accumulated }]);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setResultText(
        "⚠️ Could not reach Pixel backend (port 5001).\n\nPlease make sure your FastAPI backend server is running:\n`python main.py` in pixel-be"
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Follow-up chat send
  const handleSendChatMessage = async (msgText = chatInput) => {
    if (!msgText.trim() || isChatLoading) return;

    const userMsg = msgText.trim();
    setChatInput("");
    const updatedMessages = [...chatMessages, { role: "user", text: userMsg }];
    setChatMessages(updatedMessages);
    setIsChatLoading(true);
    setActiveTab("chat");

    try {
      const history = updatedMessages.slice(1, -1);
      const response = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history,
          message: userMsg,
          analysis: resultText,
        }),
      });
      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: "⚠️ Error sending follow-up. Backend unreachable." },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Quick suggestion prompts
  const quickPrompts = {
    code: [
      { label: "💡 Explain & Fix Bug", prompt: "Explain the bug in this code snippet and provide the corrected code." },
      { label: "⚡ Convert to TypeScript", prompt: "Convert this component or code into clean, typed TypeScript." },
      { label: "🎨 Tailwind CSS", prompt: "Convert this UI design into clean React + Tailwind CSS code." },
      { label: "🚀 Optimize Performance", prompt: "How can this code be optimized for performance and readability?" },
    ],
    vision: [
      { label: "🔍 Explain What I See", prompt: "Describe all key elements and details shown in this screenshot." },
      { label: "📝 Summarize Key Points", prompt: "Provide a 3-bullet-point executive summary of this image." },
      { label: "🎨 Critique UI/UX", prompt: "Give a constructive UI/UX design review of this interface." },
    ],
    ocr: [
      { label: "📋 Clean Up Text", prompt: "Clean up and format this extracted text with proper punctuation and structure." },
      { label: "🤖 Key Entities & Data", prompt: "Extract all key numbers, dates, emails, and entities from this text." },
    ],
  };

  // Copy entire response
  const handleCopyAll = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Clear current context
  const handleReset = () => {
    setSelectedImage(null);
    setImageDimensions(null);
    setResultText("");
    setChatMessages([]);
    setCustomPrompt("");
    setChatInput("");
  };

  // Formatted markdown/code renderer
  const renderFormattedMarkdown = (content) => {
    if (!content) return null;

    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeLines = part.slice(3, -3).trim().split("\n");
        const language = codeLines[0].trim();
        const isLang = /^[a-zA-Z0-9_-]+$/.test(language);
        const code = (isLang ? codeLines.slice(1) : codeLines).join("\n");

        return (
          <div
            key={index}
            className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-zinc-950/90 shadow-md font-mono text-xs"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-white/5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 font-sans">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>{language || "code"}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setCopiedCodeIndex(index);
                  setTimeout(() => setCopiedCodeIndex(null), 2000);
                }}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-white/5"
              >
                {copiedCodeIndex === index ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedCodeIndex === index ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <pre className="p-3 text-[11.5px] leading-relaxed text-purple-200/90 overflow-x-auto whitespace-pre font-mono">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <div key={index} className="whitespace-pre-wrap leading-relaxed text-zinc-200 text-xs my-1 font-sans">
          {part}
        </div>
      );
    });
  };

  return (
    <>
      {/* Selection Overlay */}
      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => setShowOverlay(false)}
          onImageReady={handleImageReady}
        />
      )}

      {/* Main Floating Anchor - Positioned in Bottom-Left */}
      <div
        className="fixed bottom-6 left-6 z-[2147483640] select-none flex flex-col items-start gap-3 pointer-events-auto font-sans"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? "none" : "transform 0.1s ease",
        }}
      >
        {/* EXPANDED POPUP CARD (Docked in Bottom-Left directly above avatar) */}
        {isOpen && !isMinimized && (
          <div
            ref={popupRef}
            className="w-[390px] h-[550px] max-h-[85vh] bg-zinc-950/95 border border-purple-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header with Drag Handle & Status */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-950/70 via-zinc-900/90 to-indigo-950/70 border-b border-white/10">
              <div
                className="flex items-center gap-2.5 cursor-move flex-1"
                onMouseDown={handleMouseDown}
                title="Drag to reposition widget"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-md shadow-purple-600/30">
                  <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">PIXEL AI</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                        backendStatus
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${backendStatus ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                      {backendStatus ? "Live" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1">
                {selectedImage && (
                  <button
                    onClick={handleReset}
                    title="Reset / Clear image"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  title="Minimize popup"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close popup"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Pills */}
            <div className="px-3 pt-2.5 pb-2 bg-zinc-900/60 border-b border-white/5 flex gap-1.5">
              {[
                { id: "vision", label: "Vision", icon: Sparkles, color: "hover:text-purple-300" },
                { id: "code", label: "Code", icon: Terminal, color: "hover:text-indigo-300" },
                { id: "ocr", label: "OCR", icon: Cpu, color: "hover:text-emerald-300" },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveMode(m.id);
                      if (selectedImage) runAnalysis(selectedImage);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Action Toolbar: Snip Screen Button & Image Badge */}
            <div className="p-3 bg-zinc-900/40 border-b border-white/5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOverlay(true)}
                  className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{selectedImage ? "Snip New Area" : "Snip Screen Area"}</span>
                  <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-purple-200">
                    Alt+S
                  </span>
                </button>

                {resultText && (
                  <button
                    onClick={handleCopyAll}
                    title="Copy full analysis"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-2 rounded-xl text-xs transition-colors flex items-center justify-center border border-white/5"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Active Image Thumbnail Pill */}
              {selectedImage && (
                <div className="flex items-center justify-between bg-zinc-900/80 border border-white/10 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Crop Thumbnail"
                      className="w-8 h-8 rounded-lg object-cover border border-purple-500/40 shrink-0"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] font-semibold text-zinc-200 truncate">
                        Active Crop
                      </span>
                      {imageDimensions && (
                        <span className="text-[9.5px] font-mono text-zinc-400">
                          {imageDimensions.width} × {imageDimensions.height} px
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => runAnalysis(selectedImage)}
                      disabled={isLoading}
                      className="text-[10px] bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-1 rounded-lg transition-colors font-medium"
                    >
                      Re-run
                    </button>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Instruction Input (Optional override) */}
            <div className="px-3 py-1.5 bg-zinc-950/40 border-b border-white/5 flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                placeholder={
                  activeMode === "code"
                    ? "Custom: e.g. convert to TS with Tailwind"
                    : activeMode === "ocr"
                    ? "Custom: e.g. only numbers and tables"
                    : "Custom: e.g. what is causing error in line 4?"
                }
                className="flex-1 text-[11px] bg-zinc-900/80 border border-white/5 rounded-lg px-2.5 py-1 text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                disabled={isLoading || !selectedImage}
                onClick={() => runAnalysis()}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1"
              >
                Run
              </button>
            </div>

            {/* View Tabs: Result View vs Interactive Chat */}
            <div className="flex border-b border-white/5 bg-zinc-900/30 px-3 text-xs">
              <button
                onClick={() => setActiveTab("result")}
                className={`py-2 px-3 text-[11px] font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === "result"
                    ? "border-purple-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                Response
                {isStreaming && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={`py-2 px-3 text-[11px] font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeTab === "chat"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <MessageSquare className="w-3 h-3 text-indigo-400" />
                Chat ({chatMessages.length})
              </button>
            </div>

            {/* Main Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col gap-2.5">
              {activeTab === "result" ? (
                <>
                  {/* Results or Empty State */}
                  {resultText ? (
                    <div className="flex flex-col gap-2">
                      {renderFormattedMarkdown(resultText)}
                      {isStreaming && (
                        <div className="flex items-center gap-2 text-[11px] text-purple-400 animate-pulse mt-1">
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                          <span>Streaming tokens from Gemini...</span>
                        </div>
                      )}
                    </div>
                  ) : isLoading ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center gap-2.5 text-zinc-400">
                      <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                      <span className="text-xs font-medium text-purple-300">
                        {activeMode === "ocr" ? "Extracting text with EasyOCR..." : "Analyzing screen area with Gemini..."}
                      </span>
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-center gap-2 text-zinc-500 p-4">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-purple-400 mb-1">
                        <Camera className="w-5 h-5 text-purple-400" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-300">
                        No screen area selected
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-[240px]">
                        Click <span className="text-purple-300 font-semibold">"Snip Screen Area"</span> or press <kbd className="px-1 py-0.5 bg-zinc-900 border border-white/10 rounded font-mono text-zinc-300 text-[10px]">Alt+S</kbd> to analyze anything on your screen.
                      </p>
                    </div>
                  )}

                  {/* Follow-up Quick Chips */}
                  {resultText && !isStreaming && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        Quick Follow-ups:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(quickPrompts[activeMode] || []).map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendChatMessage(chip.prompt)}
                            className="text-[10px] bg-zinc-900 hover:bg-purple-600/30 hover:border-purple-500/40 border border-white/5 text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg transition-all text-left"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Chat Tab View */
                <div className="flex flex-col gap-2.5">
                  {chatMessages.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-zinc-500 text-center gap-2">
                      <MessageSquare className="w-6 h-6 text-zinc-600" />
                      <p className="text-[11px]">Ask any follow-up questions about this screen!</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role !== "user" && (
                          <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3 h-3" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] text-xs rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap shadow-sm ${
                            msg.role === "user"
                              ? "bg-purple-600 text-white rounded-br-sm"
                              : "bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {isChatLoading && (
                    <div className="flex gap-1.5 justify-start">
                      <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3 h-3 animate-spin" />
                      </div>
                      <div className="bg-zinc-900 border border-white/5 text-zinc-400 text-[11px] rounded-2xl rounded-bl-sm px-3 py-1.5 animate-pulse">
                        Pixel is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            {/* Bottom Follow-up Input Bar */}
            <div className="p-2.5 bg-zinc-900/90 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                placeholder="Ask Pixel a question..."
                className="flex-1 text-xs bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={isChatLoading || !chatInput.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* MINIMIZED PILL (If user clicked minimize) */}
        {isOpen && isMinimized && (
          <div
            onClick={() => setIsMinimized(false)}
            className="bg-zinc-900/90 hover:bg-zinc-800 border border-purple-500/40 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Pixel Assistant</span>
            <Maximize2 className="w-3.5 h-3.5 text-zinc-400 ml-1" />
          </div>
        )}

        {/* FLOATING AVATAR TRIGGER (Bottom-Left) */}
        <div
          className="relative group cursor-pointer"
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (!dragRef.current.hasMoved) {
              setIsOpen((prev) => !prev);
              setIsMinimized(false);
            }
          }}
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 opacity-60 blur-md group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />

          {/* Main Avatar Orb */}
          <div
            className={`
              relative w-14 h-14 rounded-2xl
              bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500
              p-0.5 shadow-2xl shadow-purple-600/40 flex items-center justify-center
              ${isDragging ? "cursor-grabbing scale-105" : "hover:scale-110 cursor-pointer"}
              ${isLoading || isStreaming ? "animate-bounce" : ""}
              transition-all duration-200
            `}
          >
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <Sparkles className="w-6 h-6 text-purple-400 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-300" />

              {/* Status Indicator Dot on Corner */}
              <div
                className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                  backendStatus ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-rose-500"
                }`}
                title={backendStatus ? "Backend Connected (port 5001)" : "Backend Offline"}
              />

              {/* Subtle hover highlight */}
              <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Tooltip on Hover when Closed */}
          {!isOpen && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-zinc-900 border border-white/10 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1.5">
              <span>Pixel AI Assistant</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                Click
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
