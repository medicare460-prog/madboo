import { useEffect, useState } from "react";

interface Particle {
  id: number;
  left: string;
  color: string;
  size: string;
  delay: string;
  duration: string;
  shape: "circle" | "square" | "triangle";
}

export default function ConfettiEffect({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const colors = ["#7C3AED", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#EC4899"];
    const shapes: Particle["shape"][] = ["circle", "square", "triangle"];

    const newParticles = Array.from({ length: 120 }).map((_, i) => {
      const size = Math.floor(Math.random() * 8) + 6 + "px";
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = (Math.random() * 2).toFixed(2) + "s";
      const duration = (Math.random() * 3 + 2).toFixed(2) + "s";
      const left = (Math.random() * 100).toFixed(2) + "%";
      const shape = shapes[Math.floor(Math.random() * shapes.length)];

      return {
        id: i,
        left,
        color,
        size,
        delay,
        duration,
        shape
      };
    });

    setParticles(newParticles);
  }, [active]);

  if (!active) return null;

  return (
    <div id="confetti-container" className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => {
        let borderRadius = "0px";
        if (p.shape === "circle") borderRadius = "50%";

        return (
          <div
            key={p.id}
            className="confetti-particle absolute"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              backgroundColor: p.shape !== "triangle" ? p.color : "transparent",
              borderLeft: p.shape === "triangle" ? `${parseInt(p.size) / 2}px solid transparent` : undefined,
              borderRight: p.shape === "triangle" ? `${parseInt(p.size) / 2}px solid transparent` : undefined,
              borderBottom: p.shape === "triangle" ? `${p.size} solid ${p.color}` : undefined,
              borderRadius,
              animationDelay: p.delay,
              animationDuration: p.duration,
              top: "-20px"
            }}
          />
        );
      })}
    </div>
  );
}
