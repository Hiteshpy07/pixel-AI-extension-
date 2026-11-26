import React, { useState, useRef, useEffect } from "react";
import SelectionOverlay from "../SelectionOverlay";
import MascotAvatar from "./MascotAvatar";
import {
  Sparkles,
  Terminal,
  Camera,
  MessageSquare,
  Send,
  X,
  Minus,
  Copy,
  Check,
  Maximize2,
  Trash2,
  Folder,
  Layers,
  Share2,
  RefreshCw,
  GitBranch,
  ArrowRight
} from "lucide-react";

export default function FloatingPixelAssistant({ isExtension = false }) {
  // ---------------------------------------------------------------------------
  // 1. UI & Widget State
  // ---------------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis"); // "analysis" | "chat" | "graph"
  const [showOverlay, setShowOverlay] = useState(false);
  const [backendStatus, setBackendStatus] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. Data & Memory State
  // ---------------------------------------------------------------------------
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [screenMetadata, setScreenMetadata] = useState(null); // { project, tabs, diagrams }
  const [activeNodeId, setActiveNodeId] = useState(null); // Current branch parent node in SQLite

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Graph State
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);

  // UI Utilities
  const [copiedCodeIndex, setCopiedCodeIndex] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Dynamic Avatar State
  const mascotState = isLoading
    ? "thinking"
    : isChatLoading
    ? "responding"
    : "idle";

  // ---------------------------------------------------------------------------
  // 3. Dragging & Positioning State (Untouched Avatar Anchor)
  // ---------------------------------------------------------------------------
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });
  const chatBottomRef = useRef(null);
  const popupRef = useRef(null);

  // Health-check ping to FastAPI (http://localhost:5001/health)
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

  // Keyboard shortcut listener: Alt+S to snip, Esc to close
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

  // Chrome Extension message listener
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
      return () => chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    }
  }, []);

  // Auto-scroll chat view
  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatLoading, activeTab]);

  // Avatar dragging handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.clientX - position.x;
    dragRef.current.startY = e.clientY - position.y;
    dragRef.current.hasMoved = false;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      dragRef.current.hasMoved = true;
      const newX = e.clientX - dragRef.current.startX;
      const newY = e.clientY - dragRef.current.startY;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
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

  // ---------------------------------------------------------------------------
  // 4. Backend Ingestion & Analysis: POST /capture
  // ---------------------------------------------------------------------------
  const handleImageReady = (rawBase64) => {
    const fullDataUrl = `data:image/png;base64,${rawBase64}`;
    setSelectedImage(fullDataUrl);
    setShowOverlay(false);
    setIsOpen(true);
    setIsMinimized(false);

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = fullDataUrl;

    runCapture(fullDataUrl);
  };

  const runCapture = async (imageData = selectedImage, promptOverride = null) => {
    if (!imageData) return;

    setIsLoading(true);
    setResultText("");
    setActiveTab("chat"); // Smoothly switch to Chat view immediately!

    const promptToSend =
      promptOverride ||
      customPrompt ||
      "Analyze this screen. Explain the code, diagnose any errors, and describe the diagrams.";

    // Smoothly insert the user's screen capture into the chat flow!
    const userCaptureMsg = {
      role: "user",
      text: promptToSend,
      image: imageData,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userCaptureMsg]);

    try {
      const response = await fetch("http://localhost:5001/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          prompt: promptToSend,
          parent_node_id: activeNodeId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      // Record screen metadata from backend
      setScreenMetadata({
        project: data.project || "General Workspace",
        tabs: data.detected_tabs || [],
        diagrams: data.diagrams_found || 0,
      });

      // Update current active branch node in SQLite graph
      if (data.screen_node_id) {
        setActiveNodeId(data.screen_node_id);
      }

      const reply = data.ai_response || "Screen analyzed, diagram contours extracted, and memory indexed in SQLite graph.";
      setResultText(reply);
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: reply, timestamp: Date.now() },
      ]);

      // Silently refresh graph memory in background
      fetchGraph();
    } catch (error) {
      console.error("Capture error:", error);
      const errMsg = "⚠️ Could not reach Pixel backend on port 5001.\n\nPlease start the server:\n`cd pixel-be && python main.py`";
      setResultText(errMsg);
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: errMsg, timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Branching Follow-up Chat: POST /chat
  // ---------------------------------------------------------------------------
  const handleSendChatMessage = async (msgText = chatInput) => {
    if (!msgText.trim() || isChatLoading) return;

    const userMsg = msgText.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsChatLoading(true);
    setActiveTab("chat");

    try {
      const response = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          parent_node_id: activeNodeId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat error ${response.status}`);
      }

      const data = await response.json();

      // Chain the branch forward to the AI's reply node!
      if (data.ai_node_id) {
        setActiveNodeId(data.ai_node_id);
      }

      setChatMessages((prev) => [...prev, { role: "model", text: data.reply }]);
      fetchGraph();
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "model", text: "⚠️ Error sending follow-up message. Is port 5001 running?" },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Obsidian Knowledge Graph: GET /graph & GET /graph/branch/:id
  // ---------------------------------------------------------------------------
  const fetchGraph = async () => {
    setIsGraphLoading(true);
    try {
      const res = await fetch("http://localhost:5001/graph");
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.log("Graph fetch failed:", e);
    } finally {
      setIsGraphLoading(false);
    }
  };

  const handleSelectBranch = async (nodeId) => {
    try {
      const res = await fetch(`http://localhost:5001/graph/branch/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        const chain = data.chain || [];

        // Convert ancestor chain into chat messages
        const reconstructedMessages = chain
          .filter((n) => n.type === "chat_message")
          .map((n) => ({
            role: n.title.startsWith("User:") ? "user" : "model",
            text: n.content,
          }));

        if (reconstructedMessages.length > 0) {
          setChatMessages(reconstructedMessages);
        }

        setActiveNodeId(nodeId);
        setActiveTab("chat");
      }
    } catch (e) {
      console.error("Branch load error:", e);
    }
  };

  // Reset current session
  const handleReset = () => {
    setSelectedImage(null);
    setImageDimensions(null);
    setResultText("");
    setChatMessages([]);
    setCustomPrompt("");
    setChatInput("");
    setScreenMetadata(null);
    setActiveNodeId(null);
    setSelectedGraphNode(null);
  };

  // Copy helpers
  const handleCopyAll = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Markdown code renderer
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
      {/* ----------------------------------------------------------------- */}
      {/* Selection Overlay for screen sniping                               */}
      {/* ----------------------------------------------------------------- */}
      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => setShowOverlay(false)}
          onImageReady={handleImageReady}
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Floating Widget Anchor (Positioned Bottom-Left)                    */}
      {/* ----------------------------------------------------------------- */}
      <div
        className="fixed bottom-6 left-6 z-[2147483640] select-none flex flex-col items-start gap-3 pointer-events-auto font-sans"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? "none" : "transform 0.1s ease",
        }}
      >
        {/* --------------------------------------------------------------- */}
        {/* EXPANDED POPUP CARD (Docked directly above avatar)               */}
        {/* --------------------------------------------------------------- */}
        {isOpen && !isMinimized && (
          <div
            ref={popupRef}
            className="w-[400px] h-[570px] max-h-[85vh] bg-zinc-950/95 border border-purple-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header: Mascot, Title & Status */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-950/70 via-zinc-900/90 to-indigo-950/70 border-b border-white/10">
              <div
                className="flex items-center gap-2.5 cursor-move flex-1"
                onMouseDown={handleMouseDown}
                title="Drag to reposition widget"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500 p-0.5 shadow-md shadow-amber-500/25 shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 rounded-[10px] flex items-center justify-center overflow-hidden border border-amber-300/60 shadow-inner">
                    <MascotAvatar state={mascotState} className="w-full h-full" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">PIXEL BRAIN</span>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                        backendStatus
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${backendStatus ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                      {backendStatus ? "Live (5001)" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {(selectedImage || resultText) && (
                  <button
                    onClick={handleReset}
                    title="Reset session"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  title="Minimize"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Snip Toolbar & Thumbnail */}
            <div className="p-3 bg-zinc-900/40 border-b border-white/5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOverlay(true)}
                  className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{selectedImage ? "Snip New Screen" : "Snip Screen Area"}</span>
                  <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-purple-200">
                    Alt+S
                  </span>
                </button>

                {resultText && (
                  <button
                    onClick={handleCopyAll}
                    title="Copy analysis text"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-2 rounded-xl text-xs transition-colors flex items-center justify-center border border-white/5"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Active Image Thumbnail & Detected Project Badge */}
              {selectedImage && (
                <div className="flex items-center justify-between bg-zinc-900/80 border border-white/10 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={selectedImage}
                      alt="Crop"
                      className="w-8 h-8 rounded-lg object-cover border border-purple-500/40 shrink-0"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] font-semibold text-zinc-200 truncate flex items-center gap-1">
                        <Folder className="w-3 h-3 text-purple-400 inline" />
                        {screenMetadata?.project || "Analyzing..."}
                      </span>
                      {imageDimensions && (
                        <span className="text-[9.5px] font-mono text-zinc-400">
                          {imageDimensions.width} × {imageDimensions.height} px
                          {screenMetadata?.diagrams > 0 && ` • ${screenMetadata.diagrams} diagrams`}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => runCapture(selectedImage)}
                    disabled={isLoading}
                    className="text-[10px] bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-1 rounded-lg transition-colors font-medium"
                  >
                    Re-run
                  </button>
                </div>
              )}
            </div>

            {/* Clean 3 Navigation Tabs */}
            <div className="flex border-b border-white/5 bg-zinc-900/50 px-2 text-xs">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`flex-1 py-2 text-[11px] font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "analysis"
                    ? "border-purple-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Analysis
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-2 text-[11px] font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "chat"
                    ? "border-indigo-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Chat ({chatMessages.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab("graph");
                  fetchGraph();
                }}
                className={`flex-1 py-2 text-[11px] font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "graph"
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                Graph ({graphData.nodes?.length || 0})
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* TAB 1: ANALYSIS                                               */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "analysis" && (
              <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col gap-2.5">
                {/* Detected Tabs Chips */}
                {screenMetadata?.tabs?.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] text-zinc-400">
                    <span className="text-zinc-500 uppercase font-bold shrink-0">Tabs:</span>
                    {screenMetadata.tabs.slice(0, 3).map((tab, idx) => (
                      <span
                        key={idx}
                        className="bg-zinc-900 border border-white/5 px-2 py-0.5 rounded-md text-purple-300 truncate max-w-[120px]"
                      >
                        {tab}
                      </span>
                    ))}
                  </div>
                )}

                {/* Analysis Response */}
                {resultText ? (
                  <div className="flex flex-col gap-2">
                    {renderFormattedMarkdown(resultText)}
                  </div>
                ) : isLoading ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center gap-2.5 text-zinc-400">
                    <div className="w-8 h-8 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                    <span className="text-xs font-medium text-purple-300">
                      Slicing tabs, detecting diagrams & reasoning...
                    </span>
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-center gap-2 text-zinc-500 p-4">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-purple-400 mb-1">
                      <Camera className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-300">No screen area captured yet</p>
                    <p className="text-[11px] text-zinc-500 max-w-[240px]">
                      Press <kbd className="px-1 py-0.5 bg-zinc-900 border border-white/10 rounded font-mono text-zinc-300 text-[10px]">Alt+S</kbd> to snip any code, error, or architecture diagram.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 2: BRANCH CHAT                                            */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "chat" && (
              <div className="flex-1 overflow-y-auto p-3 text-xs flex flex-col gap-3">
                {chatMessages.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-zinc-500 text-center gap-2">
                    <MessageSquare className="w-6 h-6 text-zinc-600" />
                    <p className="text-[11px]">Snip any screen area (Alt+S) or ask Pixel a question!</p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role !== "user" && (
                        <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Sparkles className="w-3 h-3" />
                        </div>
                      )}

                      <div
                        className={`max-w-[88%] text-xs rounded-2xl px-3 py-2.5 leading-relaxed shadow-md flex flex-col gap-1.5 ${
                          msg.role === "user"
                            ? "bg-purple-600 text-white rounded-br-sm"
                            : "bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-sm"
                        }`}
                      >
                        {/* Smooth Animated Screen Capture Card */}
                        {msg.image && (
                          <div className="relative overflow-hidden rounded-xl border border-purple-400/40 bg-black/60 shadow-lg shadow-purple-950/60 mb-1 group transition-all duration-300 animate-in fade-in zoom-in-95">
                            <img
                              src={msg.image}
                              alt="Captured screen snippet"
                              className="w-full max-h-52 object-contain rounded-lg"
                            />
                            <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[9.5px] font-mono text-purple-200 border border-purple-500/30 flex items-center gap-1 shadow-sm">
                              <Camera className="w-3 h-3 text-purple-400" />
                              <span>Screen Snippet</span>
                            </div>
                          </div>
                        )}

                        {/* Message Text */}
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.role === "user" ? (
                            msg.text
                          ) : (
                            renderFormattedMarkdown(msg.text)
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Animated Thinking & Slicing Indicator */}
                {(isLoading || isChatLoading) && (
                  <div className="flex gap-2 justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3 h-3 animate-spin" />
                    </div>
                    <div className="bg-zinc-900 border border-purple-500/30 text-zinc-300 text-[11px] rounded-2xl rounded-bl-sm px-3.5 py-2 flex items-center gap-2 shadow-lg shadow-purple-950/40">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      <span className="font-medium text-purple-200">
                        {isLoading
                          ? "Slicing tabs, isolating diagrams & reasoning..."
                          : "Searching vector memory & formulating answer..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: OBSIDIAN KNOWLEDGE GRAPH VIEW                          */}
            {/* ------------------------------------------------------------- */}
            {activeTab === "graph" && (
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-white/5">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-emerald-400" />
                    Obsidian Knowledge Graph
                  </span>
                  <button
                    onClick={fetchGraph}
                    title="Refresh graph"
                    className="p-1 hover:text-white transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGraphLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {graphData.nodes?.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center text-zinc-500 gap-2">
                    <Share2 className="w-6 h-6 text-zinc-600" />
                    <p className="text-[11px]">No graph memory recorded yet. Snip a screen to build your tree!</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {graphData.nodes.map((n) => {
                      const isCurrent = n.id === activeNodeId;
                      const typeBadge =
                        n.type === "project"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : n.type === "screen"
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

                      return (
                        <div
                          key={n.id}
                          onClick={() => handleSelectBranch(n.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                            isCurrent
                              ? "bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10"
                              : "bg-zinc-900/60 border-white/5 hover:border-white/20 hover:bg-zinc-900"
                          }`}
                        >
                          <div className="flex flex-col overflow-hidden max-w-[280px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${typeBadge}`}>
                                {n.type}
                              </span>
                              <span className="text-[11px] font-semibold text-zinc-200 truncate">
                                {n.name}
                              </span>
                            </div>
                            {n.content && (
                              <span className="text-[10px] text-zinc-500 truncate mt-0.5 font-sans">
                                {n.content.slice(0, 60)}...
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9.5px] text-zinc-400">Load</span>
                            <ArrowRight className="w-3 h-3 text-purple-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Follow-up Input Bar (Visible on all tabs) */}
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

        {/* --------------------------------------------------------------- */}
        {/* MINIMIZED PILL                                                  */}
        {/* --------------------------------------------------------------- */}
        {isOpen && isMinimized && (
          <div
            onClick={() => setIsMinimized(false)}
            className="bg-zinc-900/90 hover:bg-zinc-800 border border-purple-500/40 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-bold text-white">Pixel Brain</span>
            <Maximize2 className="w-3.5 h-3.5 text-zinc-400 ml-1" />
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* FLOATING AVATAR TRIGGER (Bottom-Left - Preserved as-is)          */}
        {/* --------------------------------------------------------------- */}
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
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 opacity-40 blur-md group-hover:opacity-80 transition-opacity duration-300 animate-pulse" />

          {/* Main Avatar Box */}
          <div
            className={`
              relative w-10 h-10 rounded-xl
              bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500
              p-0.5 shadow-xl shadow-amber-500/25 flex items-center justify-center
              ${isDragging ? "cursor-grabbing scale-105" : "hover:scale-110 cursor-pointer"}
              transition-all duration-200
            `}
          >
            <div className="w-full h-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 rounded-[10px] flex items-center justify-center relative overflow-hidden border border-amber-300/60 shadow-inner">
              <MascotAvatar state={mascotState} className="w-full h-full" />

              {/* Instant Camera Snip Trigger */}
              {!isOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOverlay(true);
                  }}
                  title="Snip Screen Area (Alt+S)"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/50 flex items-center justify-center hover:scale-125 active:scale-95 transition-all z-20 border border-white/20"
                >
                  <Camera className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Status Indicator Dot on Corner */}
              <div
                className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-amber-200 z-10 ${
                  backendStatus ? "bg-emerald-500 shadow-sm shadow-emerald-500" : "bg-rose-500"
                }`}
                title={backendStatus ? "Backend Connected (port 5001)" : "Backend Offline"}
              />

              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>

          {/* Tooltip on Hover when Closed */}
          {!isOpen && (
            <div className="absolute left-13 top-1/2 -translate-y-1/2 bg-zinc-900 border border-white/10 text-white text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex items-center gap-1.5">
              <span>Pixel AI Brain</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Click
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
