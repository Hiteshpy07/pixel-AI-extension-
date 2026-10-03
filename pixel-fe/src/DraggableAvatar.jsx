import React, { useState, useRef, useEffect } from "react";
import SelectionOverlay from "./SelectionOverlay";
import { MessageSquare, X, Send, Sparkles, Crop, Bot } from "lucide-react";

const DraggableAvatar = ({ onScreenshotReceived }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showMiniChat, setShowMiniChat] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  const handleImageReady = async (base64Data) => {
    setIsThinking(true);
    setMessages([]);
    setAnalysis("");
    setShowMiniChat(true);

    if (onScreenshotReceived) {
      onScreenshotReceived(`data:image/png;base64,${base64Data}`);
    }

    try {
      // Stream tokens from FastAPI backend
      const response = await fetch("http://localhost:5001/stream-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          prompt: "Analyze this cropped screenshot concisely. If there is code, point out fixes and key insights.",
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      setMessages([{ role: "model", text: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamedText += chunk;
        setMessages([{ role: "model", text: streamedText }]);
      }

      setAnalysis(streamedText);
    } catch (error) {
      console.error("Connection to backend failed", error);
      setMessages([{ role: "model", text: "Pixel is ready! Make sure backend is running on http://localhost:5001." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isChatLoading) return;

    const userMessage = inputText.trim();
    setInputText("");

    const updatedMessages = [...messages, { role: "user", text: userMessage }];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      const history = updatedMessages.slice(1, -1);

      const response = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message: userMessage, analysis }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "model", text: "Could not send message. Please check backend connection." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

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
      setPosition({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      if (!dragRef.current.hasMoved) setShowOverlay(true);
    };
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-50 select-none cursor-move flex flex-col items-end gap-3"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? "none" : "transform 0.1s ease",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Floating Mini Chat Bubble */}
        {showMiniChat && (
          <div
            className="bg-zinc-900/95 border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col w-84 h-[420px] backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
                <span className="text-xs font-bold text-white tracking-wide">Pixel Floating Assistant</span>
              </div>
              <button
                onClick={() => setShowMiniChat(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 text-xs">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role !== "user" && (
                    <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-zinc-800/90 text-zinc-200 border border-white/5 rounded-bl-sm"
                    }`}
                  >
                    {msg.text || (isThinking ? "Analyzing screen..." : "")}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-1.5 justify-start">
                  <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 animate-spin-slow" />
                  </div>
                  <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-sm px-3 py-1.5 animate-pulse text-[11px]">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            <div className="p-2.5 border-t border-white/10 bg-zinc-950/80 flex gap-2" onMouseDown={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask Pixel about this screen..."
                className="flex-1 text-xs bg-zinc-800/90 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-500 placeholder:text-zinc-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isChatLoading || !inputText.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all shadow-md shadow-purple-600/30"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Floating Avatar Trigger Icon */}
        <div
          className={`
            w-16 h-16 rounded-2xl
            bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500
            p-0.5 shadow-2xl shadow-purple-600/40 flex items-center justify-center relative overflow-hidden
            ${isDragging ? "scale-105 cursor-grabbing" : "hover:scale-110 cursor-pointer"}
            ${isThinking ? "animate-bounce" : ""}
            transition-all duration-200
          `}
          title="Click to crop screen or drag to move"
        >
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center relative overflow-hidden group">
            <Sparkles className="w-7 h-7 text-purple-400 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-300" />
            <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => setShowOverlay(false)}
          onImageReady={handleImageReady}
        />
      )}
    </>
  );
};

export default DraggableAvatar;
