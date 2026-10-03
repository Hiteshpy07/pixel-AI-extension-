import React, { useState, useRef, useEffect } from "react";

export default function SelectionOverlay({ onCaptured, onImageReady }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Dark semi-transparent mask
    ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isSelecting) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      // Clear the selection rectangle
      ctx.clearRect(x, y, width, height);

      // Draw stylish border around selection
      ctx.strokeStyle = "#a855f7"; // Tailwind purple-500
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]); // Reset dash

      // Dimension badge tooltip
      const badgeText = `${Math.round(width)} × ${Math.round(height)} px`;
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      const textWidth = ctx.measureText(badgeText).width;
      const badgeW = textWidth + 16;
      const badgeH = 22;
      const badgeX = x;
      const badgeY = y > badgeH + 6 ? y - badgeH - 6 : y + 6;

      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(badgeText, badgeX + 8, badgeY + 15);
    }
  }, [isSelecting, startPos, currentPos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCaptured();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCaptured]);

  const captureViaDisplayMedia = async (cropData) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = video.videoWidth;
      fullCanvas.height = video.videoHeight;
      const fullCtx = fullCanvas.getContext("2d");
      fullCtx.drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      // Scale factors if window devicePixelRatio or screen size differs
      const scaleX = video.videoWidth / window.innerWidth;
      const scaleY = video.videoHeight / window.innerHeight;

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropData.width * scaleX;
      cropCanvas.height = cropData.height * scaleY;
      const cropCtx = cropCanvas.getContext("2d");

      cropCtx.drawImage(
        fullCanvas,
        cropData.x * scaleX,
        cropData.y * scaleY,
        cropData.width * scaleX,
        cropData.height * scaleY,
        0,
        0,
        cropCanvas.width,
        cropCanvas.height
      );

      const base64DataUrl = cropCanvas.toDataURL("image/png");
      const rawBase64 = base64DataUrl.split(",")[1];
      if (onImageReady) onImageReady(rawBase64);
      onCaptured();
    } catch (err) {
      console.warn("DisplayMedia capture canceled or failed", err);
      onCaptured();
    }
  };

  const finalizeCapture = async (cropData) => {
    // 1. If running inside Chrome Extension content script context
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      chrome.runtime.sendMessage(
        { type: "CAPTURE_TAB", cropData },
        async (response) => {
          if (response && response.success && response.base64) {
            if (onImageReady) onImageReady(response.base64);
            onCaptured();
          } else {
            // Fallback to DisplayMedia if background script not responding
            await captureViaDisplayMedia(cropData);
          }
        }
      );
      return;
    }

    // 2. Otherwise web development mode fallback
    await captureViaDisplayMedia(cropData);
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    const cropData = {
      x: Math.min(startPos.x, currentPos.x),
      y: Math.min(startPos.y, currentPos.y),
      width: Math.abs(currentPos.x - startPos.x),
      height: Math.abs(currentPos.y - startPos.y),
    };

    if (cropData.width > 15 && cropData.height > 15) {
      finalizeCapture(cropData);
    } else {
      onCaptured();
    }
  };

  return (
    <div className="fixed inset-0 z-[2147483647] select-none cursor-crosshair">
      <canvas
        ref={canvasRef}
        onMouseDown={(e) => {
          setIsSelecting(true);
          setStartPos({ x: e.clientX, y: e.clientY });
          setCurrentPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseMove={(e) => {
          if (isSelecting) setCurrentPos({ x: e.clientX, y: e.clientY });
        }}
        onMouseUp={handleMouseUp}
        className="w-full h-full block"
      />

      {/* Top Helper Banner */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-purple-500/40 px-5 py-2 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs text-white pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
        <span className="font-semibold text-purple-200">Drag to crop any area</span>
        <span className="text-zinc-400">|</span>
        <span className="text-zinc-400 text-[11px]">Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-zinc-300">ESC</kbd> to cancel</span>
      </div>
    </div>
  );
}