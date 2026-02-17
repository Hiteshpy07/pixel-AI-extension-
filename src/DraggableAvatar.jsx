// import { useState, useRef, useEffect } from 'react';
// import SelectionOverlay from './SelectionOverlay';
// const DraggableAvatar = () => {
//   const [isDragging, setIsDragging] = useState(false);
//   const [position, setPosition] = useState({ x: 0, y: 0 });
  
//   const dragRef = useRef({
//     startX: 0,
//     startY: 0,
//     offsetX: 0,
//     offsetY: 0
//   });

//   const handleMouseDown = (e) => {
//     setIsDragging(true);
//     dragRef.current.startX = e.clientX - position.x;
//     dragRef.current.startY = e.clientY - position.y;
//   };

//   const handleTouchStart = (e) => {
//     setIsDragging(true);
//     dragRef.current.startX = e.touches[0].clientX - position.x;
//     dragRef.current.startY = e.touches[0].clientY - position.y;
//   };

//   useEffect(() => {
//     const handleMouseMove = (e) => {
//       if (!isDragging) return;
      
//       const newX = e.clientX - dragRef.current.startX;
//       const newY = e.clientY - dragRef.current.startY;
      
//       setPosition({ x: newX, y: newY });
//     };

//     const handleTouchMove = (e) => {
//       if (!isDragging) return;
      
//       const newX = e.touches[0].clientX - dragRef.current.startX;
//       const newY = e.touches[0].clientY - dragRef.current.startY;
      
//       setPosition({ x: newX, y: newY });
//     };

//     const handleMouseUp = () => {
//       setIsDragging(false);
//     };

//     const handleTouchEnd = () => {
//       setIsDragging(false);
//     };

//     if (isDragging) {
//       document.addEventListener('mousemove', handleMouseMove);
//       document.addEventListener('mouseup', handleMouseUp);
//       document.addEventListener('touchmove', handleTouchMove);
//       document.addEventListener('touchend', handleTouchEnd);



//      const avtarclick=()=>{
//       console.log('Avatar clicked!');
//      }

//       return () => {
//         document.removeEventListener('mousemove', handleMouseMove);
//         document.removeEventListener('mouseup', handleMouseUp);
//         document.removeEventListener('touchmove', handleTouchMove);
//         document.removeEventListener('touchend', handleTouchEnd);
//       };
//     }
//   }, [isDragging]);

//   return (
//     <div
//       className="fixed bottom-5 right-5 z-50 select-none cursor-move"
//       style={{
//         transform: `translate(${position.x}px, ${position.y}px)`,
//         transition: isDragging ? 'none' : 'transform 0.1s ease'
//       }}
//       onMouseDown={handleMouseDown}
//       onTouchStart={handleTouchStart}
//     >
//       <div
//         className={`
//           w-20 h-20 rounded-full 
//           bg-gradient-to-br from-purple-500 to-purple-700
//           border-4 border-white
//           shadow-2xl
//           flex items-center justify-center
//           text-4xl text-white font-bold
//           relative overflow-hidden
//           ${isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-105'}
//           transition-all duration-200
//         `}
//       >
//         <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
//           <div className="absolute inset-0 bg-white/30 rounded-full blur-xl" onClick={(e)=>{
//             console.log('Avatar clicked!');
//           <SelectionOverlay onCaptured={() => console.log('Capture complete!')}/>
//         }}/>
//         </div >
//         <img src='/pixel_1.jpeg' />
//       </div>
//     </div>
//   );
// };

// export default DraggableAvatar;



import { useState, useRef, useEffect } from 'react';
import SelectionOverlay from './SelectionOverlay';

const DraggableAvatar = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // --- FIX 1: Add state to control overlay visibility ---
  const [showOverlay, setShowOverlay] = useState(false);

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    // --- FIX 2: Track whether the mouse actually moved (drag vs click) ---
    hasMoved: false,
  });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.clientX - position.x;
    dragRef.current.startY = e.clientY - position.y;
    // Reset the move flag every time the user presses down
    dragRef.current.hasMoved = false;
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    dragRef.current.startX = e.touches[0].clientX - position.x;
    dragRef.current.startY = e.touches[0].clientY - position.y;
    dragRef.current.hasMoved = false;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      // Mark that an actual drag movement happened
      dragRef.current.hasMoved = true;
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY,
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      dragRef.current.hasMoved = true;
      setPosition({
        x: e.touches[0].clientX - dragRef.current.startX,
        y: e.touches[0].clientY - dragRef.current.startY,
      });
    };

    // --- FIX 3: On mouse-up, decide: was it a DRAG or a CLICK? ---
    const handleMouseUp = () => {
      setIsDragging(false);
      // If the mouse never moved, treat it as a click → show overlay
      if (!dragRef.current.hasMoved) {
        setShowOverlay(true);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (!dragRef.current.hasMoved) {
        setShowOverlay(true);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
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
        onTouchStart={handleTouchStart}
      >
        <div
          className={`
            w-20 h-20 rounded-full
            bg-gradient-to-br from-purple-500 to-purple-700
            border-4 border-white
            shadow-2xl
            flex items-center justify-center
            text-4xl text-white font-bold
            relative overflow-hidden
            ${isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-105'}
            transition-all duration-200
          `}
        >
          {/* Hover shimmer effect — visual only, no click logic here */}
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-white/30 rounded-full blur-xl" />
          </div>
          <img src="/pixel_1.jpeg" alt="avatar" />
        </div>
      </div>

      {/* --- FIX 4: Render SelectionOverlay OUTSIDE the avatar div, controlled by state --- */}
      {showOverlay && (
        <SelectionOverlay
          onCaptured={() => {
            console.log('Capture complete!');
            setShowOverlay(false); // Hide overlay after capture
          }}
        />
      )}
    </>
  );
};

export default DraggableAvatar;