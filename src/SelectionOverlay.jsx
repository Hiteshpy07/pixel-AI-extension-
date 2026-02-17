// import React, { useState, useRef, useEffect } from 'react';

// const SelectionOverlay = ({ onCaptured }) => {
//   const [isSelecting, setIsSelecting] = useState(false);
//   const [startPos, setStartPos] = useState({ x: 0, y: 0 });
//   const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
//   const canvasRef = useRef(null);

//   // 1. Handle the "Dim" background and "Clear" box
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;

//     // Fill the screen with darkness
//     ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     if (isSelecting) {
//       const x = Math.min(startPos.x, currentPos.x);
//       const y = Math.min(startPos.y, currentPos.y);
//       const width = Math.abs(currentPos.x - startPos.x);
//       const height = Math.abs(currentPos.y - startPos.y);

//       // This "punches a hole" in the darkness (the non-dim area)
//       ctx.clearRect(x, y, width, height);
      
//       // Draw a clean border
//       ctx.strokeStyle = '#a855f7'; // Purple to match Pixel's vibe
//       ctx.lineWidth = 2;
//       ctx.strokeRect(x, y, width, height);
//     }
//   }, [isSelecting, currentPos]);

//   // 2. The Logic to Capture and Save to Local Machine
//   const finalizeCapture = async (cropData) => {
//     try {
//       // Request screen stream
//       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//       const video = document.createElement('video');
//       video.srcObject = stream;
//       await video.play();

//       // Draw full screen to a hidden canvas
//       const fullCanvas = document.createElement('canvas');
//       fullCanvas.width = video.videoWidth;
//       fullCanvas.height = video.videoHeight;
//       fullCanvas.getContext('2d').drawImage(video, 0, 0);

//       // Stop sharing immediately
//       stream.getTracks().forEach(track => track.stop());

//       // Create the cropped image
//       const cropCanvas = document.createElement('canvas');
//       cropCanvas.width = cropData.width;
//       cropCanvas.height = cropData.height;
//       cropCanvas.getContext('2d').drawImage(
//         fullCanvas, 
//         cropData.x, cropData.y, cropData.width, cropData.height, 
//         0, 0, cropData.width, cropData.height
//       );

//       // Trigger Download to Local Machine
//       const link = document.createElement('a');
//       link.download = `pixel-capture-${Date.now()}.png`;
//       link.href = cropCanvas.toDataURL();
//       link.click();

//       onCaptured(); // Close the overlay
//     } catch (err) {
//       console.error("Capture failed", err);
//     }
//   };

//   const handleMouseUp = () => {
//     setIsSelecting(false);
//     const cropData = {
//       x: Math.min(startPos.x, currentPos.x),
//       y: Math.min(startPos.y, currentPos.y),
//       width: Math.abs(currentPos.x - startPos.x),
//       height: Math.abs(currentPos.y - startPos.y),
//     };
//     if (cropData.width > 10) finalizeCapture(cropData);
//   };

//   return (
//     <canvas
//       ref={canvasRef}
//       onMouseDown={(e) => { setIsSelecting(true); setStartPos({ x: e.clientX, y: e.clientY }); }}
//       onMouseMove={(e) => { if (isSelecting) setCurrentPos({ x: e.clientX, y: e.clientY }); }}
//       onMouseUp={handleMouseUp}
//       className="fixed inset-0 z-[9999] cursor-crosshair"
//     />
//   );
// };

// export default SelectionOverlay;




import React, { useState, useRef, useEffect } from 'react';

const SelectionOverlay = ({ onCaptured }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // --- FIX 5: Added startPos to the dependency array (it was missing) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isSelecting) {
      const x = Math.min(startPos.x, currentPos.x);
      const y = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      ctx.clearRect(x, y, width, height);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
    }
  // startPos was missing here before — without it, the canvas wouldn't
  // redraw correctly when the user first clicks a new start position
  }, [isSelecting, startPos, currentPos]);

  // --- FIX 6: Allow Escape key to cancel the overlay ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCaptured();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCaptured]);

  const finalizeCapture = async (cropData) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = video.videoWidth;
      fullCanvas.height = video.videoHeight;
      fullCanvas.getContext('2d').drawImage(video, 0, 0);

      stream.getTracks().forEach((track) => track.stop());

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropData.width;
      cropCanvas.height = cropData.height;
      cropCanvas.getContext('2d').drawImage(
        fullCanvas,
        cropData.x, cropData.y, cropData.width, cropData.height,
        0, 0, cropData.width, cropData.height
      );

      const link = document.createElement('a');
      link.download = `pixel-capture-${Date.now()}.png`;
      link.href = cropCanvas.toDataURL();
      link.click();

      onCaptured();
    } catch (err) {
      console.error('Capture failed', err);
      onCaptured(); // Still close overlay on error
    }
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    const cropData = {
      x: Math.min(startPos.x, currentPos.x),
      y: Math.min(startPos.y, currentPos.y),
      width: Math.abs(currentPos.x - startPos.x),
      height: Math.abs(currentPos.y - startPos.y),
    };
    if (cropData.width > 10) finalizeCapture(cropData);
  };

  return (
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
      className="fixed inset-0 z-[9999] cursor-crosshair"
    />
  );
};

export default SelectionOverlay;