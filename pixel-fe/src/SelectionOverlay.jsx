
  // import React, { useState, useRef, useEffect } from 'react';

  // const SelectionOverlay = ({ onCaptured, onImageReady }) => {
  //   const [isSelecting, setIsSelecting] = useState(false);
  //   const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  //   const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  //   const canvasRef = useRef(null);

    
  //   useEffect(() => {
  //     const canvas = canvasRef.current;
  //     const ctx = canvas.getContext('2d');
  //     canvas.width = window.innerWidth;
  //     canvas.height = window.innerHeight;

  //     ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  //     ctx.fillRect(0, 0, canvas.width, canvas.height);

  //     if (isSelecting) {
  //       const x = Math.min(startPos.x, currentPos.x);
  //       const y = Math.min(startPos.y, currentPos.y);
  //       const width = Math.abs(currentPos.x - startPos.x);
  //       const height = Math.abs(currentPos.y - startPos.y);

  //       ctx.clearRect(x, y, width, height);
  //       ctx.strokeStyle = '#a855f7';
  //       ctx.lineWidth = 2;
  //       ctx.strokeRect(x, y, width, height);
  //     }
  //   }, [isSelecting, startPos, currentPos]);

  
  //   useEffect(() => {
  //     const handleKeyDown = (e) => {
  //       if (e.key === 'Escape') onCaptured();
  //     };
  //     document.addEventListener('keydown', handleKeyDown);
  //     return () => document.removeEventListener('keydown', handleKeyDown);
  //   }, [onCaptured]);

    
  //   const finalizeCapture = async (cropData) => {
  //     try {
  //       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  //       const video = document.createElement('video');
  //       video.srcObject = stream;
  //       await video.play();

  //       const fullCanvas = document.createElement('canvas');
  //       fullCanvas.width = video.videoWidth;
  //       fullCanvas.height = video.videoHeight;
  //       fullCanvas.getContext('2d').drawImage(video, 0, 0);

  //       stream.getTracks().forEach((track) => track.stop());

  //       const cropCanvas = document.createElement('canvas');
  //       cropCanvas.width = cropData.width;
  //       cropCanvas.height = cropData.height;
  //       cropCanvas.getContext('2d').drawImage(
  //         fullCanvas,
  //         cropData.x, cropData.y, cropData.width, cropData.height,
  //         0, 0, cropData.width, cropData.height
  //       );

      
  //       const base64DataUrl = cropCanvas.toDataURL('image/png');
  //       const rawBase64 = base64DataUrl.split(',')[1];
  //       if (onImageReady) {
  //         onImageReady(rawBase64);
  //       }

  //       const link = document.createElement('a');
  //       link.download = `pixel-capture-${Date.now()}.png`;
  //       link.href = base64DataUrl;
  //       link.click();

  //       onCaptured(); 
  //     } catch (err) {
  //       console.error('Capture failed', err);
  //       onCaptured(); 
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
  //       onMouseDown={(e) => {
  //         setIsSelecting(true);
  //         setStartPos({ x: e.clientX, y: e.clientY });
  //         setCurrentPos({ x: e.clientX, y: e.clientY });
  //       }}
  //       onMouseMove={(e) => {
  //         if (isSelecting) setCurrentPos({ x: e.clientX, y: e.clientY });
  //       }}
  //       onMouseUp={handleMouseUp}
  //       className="fixed inset-0 z-[9999] cursor-crosshair"
  //     />
  //   );
  // };

  // export default SelectionOverlay;



  import React, { useState, useRef, useEffect } from 'react';

const SelectionOverlay = ({ onCaptured, onImageReady }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

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
  }, [isSelecting, startPos, currentPos]);

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

      const base64DataUrl = cropCanvas.toDataURL('image/png');
      const rawBase64 = base64DataUrl.split(',')[1];
      if (onImageReady) {
        onImageReady(rawBase64);
      }

      onCaptured();
    } catch (err) {
      console.error('Capture failed', err);
      onCaptured();
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