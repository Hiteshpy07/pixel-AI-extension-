import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User, Sparkles } from "lucide-react";

export default function ChatDrawer({ messages, setMessages, analysis, isChatLoading, setIsChatLoading, onClose }) {
  const [inputText, setInputText] = useState("");
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

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
      setMessages((prev) => [...prev, { role: "model", text: "Sorry, I couldn't connect to the backend server." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-2xl backdrop-blur-md flex flex-col h-[520px] overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white">Pixel Interactive Chat</span>
            <span className="block text-[10px] text-zinc-400">Ask questions about this screen</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center gap-2">
            <MessageSquare className="w-8 h-8 text-zinc-700" />
            <p className="text-xs">No follow-up messages yet.<br />Ask Pixel anything about the screenshot!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role !== "user" && (
                <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              <div
                className={`max-w-[85%] text-xs rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.role === "user"
                    ? "bg-purple-600 text-white rounded-br-sm"
                    : "bg-zinc-800/80 text-zinc-200 border border-white/5 rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}

        {isChatLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 animate-spin-slow" />
            </div>
            <div className="bg-zinc-800/80 border border-white/5 text-zinc-400 text-xs rounded-2xl rounded-bl-sm px-3 py-2 animate-pulse">
              Pixel is thinking...
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 border-t border-white/5 bg-zinc-900/80 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Ask a follow-up question..."
          className="flex-1 text-xs bg-zinc-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={isChatLoading || !inputText.trim()}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-md shadow-purple-600/20 flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
