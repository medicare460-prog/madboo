import { useRef, useEffect, useState } from "react";
import { Sparkles, MousePointer } from "lucide-react";

interface ScratchCardComponentProps {
  onComplete: () => void;
  width?: number;
  height?: number;
}

export default function ScratchCardComponent({
  onComplete,
  width = 280,
  height = 180
}: ScratchCardComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Reset state
    setScratchProgress(0);
    setRevealed(false);

    // High DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Draw metallic silver gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#a1a8ba");
    grad.addColorStop(0.25, "#cfd5e3");
    grad.addColorStop(0.5, "#7a8190");
    grad.addColorStop(0.75, "#f1f5f9");
    grad.addColorStop(1, "#5c6270");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Add noise patterns to look more like realistic silver coating
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 2, 2);
    }

    // Draw scratch instructions on the silver surface
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 15px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH WITH MOUSE/FINGER", width / 2, height / 2 - 10);

    ctx.font = "500 12px 'Inter', sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText("Scratch 60% to reveal reward", width / 2, height / 2 + 15);
  }, [width, height]);

  const getPosition = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    isDrawing.current = true;
    scratch(e);
  };

  const scratch = (e: any) => {
    if (!isDrawing.current || revealed) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { x, y } = getPosition(e);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Throttle calculation for performance
    if (Math.random() < 0.2) {
      calculateProgress();
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    calculateProgress();
  };

  const calculateProgress = () => {
    if (revealed) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width * dpr;
    const h = height * dpr;

    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const pixels = imgData.data;
      let cleared = 0;

      // Sample every 4th alpha value to be highly performant
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) {
          cleared++;
        }
      }

      const totalSamples = pixels.length / 16;
      const percent = Math.min(Math.round((cleared / totalSamples) * 100), 100);
      setScratchProgress(percent);

      if (percent >= 60) {
        setRevealed(true);
        // Clear remaining canvas with a quick fade-out
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete();
      }
    } catch (err) {
      console.error("Error reading canvas pixels: ", err);
    }
  };

  return (
    <div className="relative select-none flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-700 shadow-2xl cursor-crosshair"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Underlay reward placeholder (visual preview underneath) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-radial from-blue-950 to-slate-950 p-4 text-center">
          <Sparkles className="h-8 w-8 text-amber-400 animate-pulse mb-1" />
          <span className="text-xs text-blue-400 font-mono tracking-widest uppercase">Revealing</span>
          <span className="text-lg font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-blue-200 to-amber-200">
            YOUR REWARD
          </span>
        </div>

        {/* Canvas overlays */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={scratch}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={scratch}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 z-10 block touch-none"
        />
      </div>

      {/* Progress Bar & Instructions */}
      <div className="mt-4 w-full max-w-[280px]">
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono mb-1">
          <span className="flex items-center gap-1">
            <MousePointer className="h-3 w-3 text-blue-400" />
            {scratchProgress < 60 ? "Scratching..." : "Revealed!"}
          </span>
          <span>{scratchProgress}% scratched</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-150"
            style={{ width: `${Math.min((scratchProgress / 60) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
