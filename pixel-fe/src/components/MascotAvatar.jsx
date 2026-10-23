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

      // Perfectly center the mascot in the 200x200 canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);

      // Subtle breathing float animation
      const floatOffset = Math.sin(frameCounter * 0.08) * 2.5;
      ctx.translate(0, floatOffset);

      // Scale up so the mascot fills the canvas uniformly with equal margins on all sides
      const scale = 1.30;
      ctx.scale(scale, scale);

      // Offset from character's original visual center (X: 100, Y: 83.5)
      ctx.translate(-100, -83.5);

      // --- 1. HAIR & HEAD CROWN (Curved top with boxy aesthetic) ---
      // Deep contrast hair base
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      safeRoundRect(ctx, 55, 30, 90, 22, [8, 8, 2, 2]);
      ctx.fill();

      // Hair sheen / highlight across top crown for depth and contrast
      ctx.fillStyle = "#334155";
      ctx.fillRect(68, 33, 64, 4);

      // Hair sides slicked back
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(52, 45, 10, 25);
      ctx.fillRect(138, 45, 10, 25);

      // --- 2. FACE BASE & EARS ---
      // Clean, bright skin tone that contrasts sharply with dark hair and warm background
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      safeRoundRect(ctx, 60, 48, 80, 55, [4, 4, 10, 10]);
      ctx.fill();

      // Ears with slight inner shadow
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(48, 62, 7, 16);
      ctx.fillRect(145, 62, 7, 16);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(50, 65, 3, 10);
      ctx.fillRect(147, 65, 3, 10);

      // --- 3. SMUG EYES & EYEBROWS ---
      ctx.fillStyle = "#020617";
      const isBlinking = currentState === "idle" && frameCounter % 140 > 132;
      if (!isBlinking) {
        // Eyes
        ctx.fillRect(78, 63, 16, 5);
        ctx.fillRect(106, 63, 16, 5);
        // Smug eyebrows
        ctx.fillRect(76, 56, 19, 4);
        ctx.fillRect(104, 56, 19, 4);
      } else {
        // Blinking slits
        ctx.fillRect(78, 65, 16, 2);
        ctx.fillRect(106, 65, 16, 2);
      }

      // Nose
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(97, 72, 6, 16);

      // --- 4. ICONIC BOXY CHIN & BEARD ---
      // Well-defined beard base
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      safeRoundRect(ctx, 65, 95, 70, 42, [4, 4, 12, 12]);
      ctx.fill();

      // Dark chin goatee / soul patch
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(92, 122, 16, 12);

      // --- 5. STATE-BASED MOUTH & ANIMATION ---
      if (currentState === "idle") {
        // Closed smirk smile
        ctx.fillStyle = "#020617";
        ctx.fillRect(88, 102, 24, 4);
      } else if (currentState === "thinking") {
        // Smirk + Thought Bubble
        ctx.fillStyle = "#020617";
        ctx.fillRect(88, 102, 20, 4);

        // Thought bubble box with high contrast outline
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        safeRoundRect(ctx, 118, 16, 48, 26, 6);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px monospace";
        ctx.fillText("...", 134, 33);

        // Bubbles trail with crisp borders
        ctx.beginPath();
        ctx.arc(114, 30, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(108, 40, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.stroke();
      } else if (currentState === "responding") {
        // Moving jaw animation
        const jawDrop = Math.abs(Math.sin(frameCounter * 0.35)) * 8;

        ctx.fillStyle = "#020617";
        ctx.fillRect(86, 100, 28, 6 + jawDrop);

        // Teeth
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(89, 102, 22, 3);

        // Sparkles during speech
        if (frameCounter % 25 < 14) {
          ctx.fillStyle = "#b45309";
          ctx.fillRect(42, 38, 5, 5);
          ctx.fillRect(148, 50, 5, 5);
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
