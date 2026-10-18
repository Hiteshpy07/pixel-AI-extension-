import React, { useEffect, useRef } from "react";

export default function MascotAvatar({
  state = "idle", // 'idle' | 'thinking' | 'responding'
  className = "w-full h-full",
}) {
  const canvasRef = useRef(null);
  const stateRef = useRef(state);

  // Keep stateRef synced with latest state without restarting RAF
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let frameCounter = 0;

    // Helper for rounded rectangle fallback
    const safeRoundRect = (ctx, x, y, w, h, radii) => {
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, radii);
      } else {
        ctx.rect(x, y, w, h);
      }
    };

    const drawMascot = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frameCounter++;

      const currentState = stateRef.current;

      ctx.save();
      const floatOffset = Math.sin(frameCounter * 0.08) * 3;
      ctx.translate(0, floatOffset);

      // --- 1. HAIR & HEAD CROWN (Curved top with boxy aesthetic) ---
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      safeRoundRect(ctx, 55, 30, 90, 22, [8, 8, 2, 2]);
      ctx.fill();

      // Hair sides slicked back
      ctx.fillRect(52, 45, 10, 25);
      ctx.fillRect(138, 45, 10, 25);

      // --- 2. FACE BASE & EARS ---
      ctx.fillStyle = "#cbd5e1"; // Light skin base
      ctx.beginPath();
      safeRoundRect(ctx, 60, 48, 80, 55, [4, 4, 10, 10]);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(48, 62, 7, 16);
      ctx.fillRect(145, 62, 7, 16);

      // --- 3. SMUG EYES & EYEBROWS ---
      ctx.fillStyle = "#0f172a";
      const isBlinking = currentState === "idle" && frameCounter % 140 > 132;
      if (!isBlinking) {
        ctx.fillRect(78, 63, 16, 5);
        ctx.fillRect(106, 63, 16, 5);
        ctx.fillRect(76, 56, 19, 4);
        ctx.fillRect(104, 56, 19, 4);
      } else {
        ctx.fillRect(78, 65, 16, 2);
        ctx.fillRect(106, 65, 16, 2);
      }

      // Nose
      ctx.fillStyle = "#64748b";
      ctx.fillRect(97, 72, 6, 16);

      // --- 4. ICONIC BOXY CHIN & BEARD ---
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      safeRoundRect(ctx, 65, 95, 70, 42, [4, 4, 12, 12]);
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(92, 122, 16, 12);

      // --- 5. STATE-BASED MOUTH & ANIMATION ---
      if (currentState === "idle") {
        // Closed smirk smile
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(88, 102, 24, 4);
      } else if (currentState === "thinking") {
        // Smirk + Thought Bubble
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(88, 102, 20, 4);

        // Thought bubble box
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        safeRoundRect(ctx, 125, 15, 52, 28, 6);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 11px monospace";
        ctx.fillText("...", 142, 33);

        // Bubbles trail
        ctx.beginPath();
        ctx.arc(118, 28, 4, 0, Math.PI * 2);
        ctx.arc(112, 38, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fill();
      } else if (currentState === "responding") {
        // Moving jaw animation
        const jawDrop = Math.abs(Math.sin(frameCounter * 0.35)) * 10;

        ctx.fillStyle = "#0f172a";
        ctx.fillRect(86, 100, 28, 6 + jawDrop);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(89, 102, 22, 3);

        // Sparkles during speech
        if (frameCounter % 25 < 14) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(40, 35, 6, 6);
          ctx.fillRect(152, 50, 6, 6);
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(drawMascot);
    };

    animationFrameId = requestAnimationFrame(drawMascot);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className={`pixelated ${className}`}
      style={{
        imageRendering: "pixelated",
      }}
    />
  );
}
