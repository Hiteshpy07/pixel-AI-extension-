
import { useState, useRef, useEffect } from 'react';
import SelectionOverlay from './SelectionOverlay';

const DraggableAvatar = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const dragRef = useRef({ startX: 0, startY: 0, hasMoved: false });
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageReady = async (base64Data) => {
    setIsThinking(true);
    setMessages([]);
    setAnalysis('');
    setShowChat(false);

    try {
      const response = await fetch('http://localhost:5001/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data }),
      });

      const data = await response.json();
      setAnalysis(data.text);
      setMessages([{ role: 'model', text: data.text }]);
      setShowChat(true);
    } catch (error) {
      console.error("Connection to backend failed", error);
      setMessages([{ role: 'model', text: "Sorry, I couldn't analyze that screenshot." }]);
      setShowChat(true);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isChatLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    const updatedMessages = [...messages, { role: 'user', text: userMessage }];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      
      const history = updatedMessages.slice(1, -1);

      const response = await fetch('http://localhost:5001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, message: userMessage, analysis }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, something went wrong." }]);
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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <>
      <div
        className="fixed bottom-5 right-5 z-50 select-none cursor-move flex flex-col items-end gap-2"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        
        {showChat && (
          <div
            className="bg-white border border-purple-200 rounded-2xl shadow-2xl flex flex-col w-80 h-96"
            onMouseDown={(e) => e.stopPropagation()}
          >
           
            <div className="flex items-center justify-between px-4 py-3 bg-purple-700 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-white">Pixel tell that:</span>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/70 hover:text-white text-xl leading-none"
              >×</button>
            </div>

           
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[85%] text-xs rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }
                  `}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 text-xs rounded-2xl rounded-bl-sm px-3 py-2 animate-pulse">
                    Pixel is thinking...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            
            <div
              className="p-3 border-t border-gray-100 flex gap-2"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask a follow-up..."
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
              />
              <button
                onClick={handleSendMessage}
                disabled={isChatLoading || !inputText.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
              >
                →
              </button>
            </div>
          </div>
        )}

        
        <div
  className={`
    w-20 h-20 rounded-full
    bg-gradient-to-br from-purple-500 to-purple-700 border-white
    border-4 shadow-2xl flex items-center justify-center relative overflow-hidden
    ${isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-105'}
    ${isThinking ? 'animate-bounce' : ''}
    transition-all duration-200
  `}
  style={isThinking ? { animationDuration: '0.8s' } : {}}
>
  <img
    src="/pixel_1.jpeg"
    alt="avatar"
    className={`transition-opacity duration-200 ${isThinking ? 'opacity-70' : 'opacity-100'}`}
  />
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