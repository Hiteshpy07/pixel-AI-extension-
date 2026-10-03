import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import ImageDropzone from "./components/ImageDropzone";
import ResultView from "./components/ResultView";
import ChatDrawer from "./components/ChatDrawer";
import DraggableAvatar from "./DraggableAvatar";
import SelectionOverlay from "./SelectionOverlay";
import { Sparkles, Terminal, Cpu, MessageSquare, Send, RefreshCw, Zap } from "lucide-react";

export default function App() {
  const [activeMode, setActiveMode] = useState("vision"); // "vision" | "code" | "ocr"
  const [selectedImage, setSelectedImage] = useState(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultText, setResultText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [backendStatus, setBackendStatus] = useState(false);
  
  // Follow-up Chat State
  const [activeTab, setActiveTab] = useState("result"); // "result" | "chat"
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Check backend health periodically
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

  const handleTriggerAnalysis = async (customPromptOverride = null) => {
    if (!selectedImage) return;

    setIsLoading(true);
    setIsStreaming(true);
    setResultText("");
    setActiveTab("result");

    const promptToSend = customPromptOverride || customPrompt || (
      activeMode === "code"
        ? "Convert this screenshot design/code into clean React + Tailwind CSS code."
        : activeMode === "ocr"
        ? "Extract all text verbatim."
        : "Analyze this screenshot in detail. If code or errors are visible, explain what it does and how to fix it."
    );

    try {
      if (activeMode === "ocr") {
        // Direct EasyOCR call
        const response = await fetch("http://localhost:5001/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: selectedImage, with_ai_summary: true }),
        });
        const data = await response.json();
        const output = data.summary 
          ? `### 📝 Extracted Text (EasyOCR):\n\n${data.text}\n\n---\n### 🤖 AI Summary:\n${data.summary}`
          : data.text;
        setResultText(output);
        setChatMessages([{ role: "model", text: output }]);
      } else {
        // Streaming Gemini Vision call
        const response = await fetch("http://localhost:5001/stream-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: selectedImage,
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
      console.error("Analysis failed:", error);
      setResultText("⚠️ Failed to reach backend server. Please make sure backend is running on port 5001.");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleFollowUpFromChips = (promptText) => {
    setActiveTab("chat");
    setChatMessages((prev) => [...prev, { role: "user", text: promptText }]);
    handleSendFollowUp(promptText);
  };

  const handleSendFollowUp = async (userMessage) => {
    setIsChatLoading(true);
    try {
      const response = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: chatMessages,
          message: userMessage,
          analysis: resultText,
        }),
      });
      const data = await response.json();
      setChatMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "model", text: "Failed to fetch response." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleScreenshotCrop = (rawBase64) => {
    setSelectedImage(`data:image/png;base64,${rawBase64}`);
    setShowOverlay(false);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Navigation */}
      <Header
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        backendStatus={backendStatus}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Dropzone & Inputs */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              1. Input Screenshot or Screen Area
            </h2>
            <p className="text-xs text-zinc-400">
              Drag & drop any code image, paste with <kbd className="px-1.5 py-0.5 bg-zinc-900 rounded text-[10px] text-zinc-300 font-mono">Cmd+V</kbd>, or crop your live screen.
            </p>
          </div>

          <ImageDropzone
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            onTriggerCrop={() => setShowOverlay(true)}
            isLoading={isLoading}
            onAnalyze={() => handleTriggerAnalysis()}
            activeMode={activeMode}
          />

          {/* Custom Prompt Input */}
          {selectedImage && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 flex flex-col gap-2.5 backdrop-blur-md">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Custom Instruction (Optional):</span>
                <span className="text-[10px] text-zinc-500 font-normal">Press Enter to Run</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTriggerAnalysis()}
                  placeholder={
                    activeMode === "code"
                      ? "e.g., Make this navbar responsive with dark mode"
                      : activeMode === "ocr"
                      ? "e.g., Only extract terminal commands"
                      : "e.g., Why is line 4 throwing a TypeError?"
                  }
                  className="flex-1 text-xs bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
                />
                <button
                  disabled={isLoading}
                  onClick={() => handleTriggerAnalysis()}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Run
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Results & Chat View */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Tabs: Result View vs Interactive Chat */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("result")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "result"
                    ? "bg-zinc-800 text-white border border-white/10 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Analysis & Code
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "chat"
                    ? "bg-zinc-800 text-white border border-white/10 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Interactive Chat ({chatMessages.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "result" ? (
            <ResultView
              resultText={resultText}
              isStreaming={isStreaming}
              onFollowUp={handleFollowUpFromChips}
              activeMode={activeMode}
            />
          ) : (
            <ChatDrawer
              messages={chatMessages}
              setMessages={setChatMessages}
              analysis={resultText}
              isChatLoading={isChatLoading}
              setIsChatLoading={setIsChatLoading}
              onClose={() => setActiveTab("result")}
            />
          )}
        </div>
      </main>

      {/* Floating Screen Grabber Widget */}
      <DraggableAvatar onScreenshotReceived={setSelectedImage} />

      {/* Area Selection Screen Overlay */}
      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => setShowOverlay(false)}
          onImageReady={handleScreenshotCrop}
        />
      )}
    </div>
  );
}
