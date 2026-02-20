
import { useState, useRef, useEffect } from 'react';
import SelectionOverlay from './SelectionOverlay';

const DraggableAvatar = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(false);
  
  // --- NEW: Track AI processing state ---
  const [isThinking, setIsThinking] = useState(false);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    hasMoved: false,
  });

  // --- NEW: Handle the image data for Days 3 & 4 ---
  const handleImageReady = async (base64Data) => {
    setIsThinking(true); // Pixel is now "Thinking"
    console.log("Image Base64:", base64Data.substring(0, 50) + "...");

    try {
      // In the next step, we will replace this with your actual API call
      // For now, we simulate a 3-second "AI Brain" processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      alert("Pixel has processed the image! (Next: Connect to Gemini API)");
    } catch (error) {
      console.error("AI Processing failed", error);
    } finally {
      setIsThinking(false); // Back to idle
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.clientX - position.x;
    dragRef.current.startY = e.clientY - position.y;
    dragRef.current.hasMoved = false;
  };

  // ... (Keep your useEffect for dragging exactly as it is) ...
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
        className="fixed bottom-5 right-5 z-50 select-none cursor-move"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          className={`
            w-20 h-20 rounded-full
            ${isThinking ? 'bg-orange-500 animate-pulse border-orange-200' : 'bg-gradient-to-br from-purple-500 to-purple-700 border-white'}
            border-4 shadow-2xl
            flex items-center justify-center
            relative overflow-hidden
            ${isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-105'}
            transition-all duration-200
          `}
        >
          {/* Thinking Overlay */}
          {isThinking && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="text-xs font-bold animate-bounce">...</span>
            </div>
          )}
          
          <img src="/pixel_1.jpeg" alt="avatar" className={isThinking ? 'opacity-50' : 'opacity-100'} />
        </div>
      </div>

      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => setShowOverlay(false)}
          onImageReady={handleImageReady} // --- Pass the data handler here ---
        />
      )}
    </>
  );
};

export default DraggableAvatar;