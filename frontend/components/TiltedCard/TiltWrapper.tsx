"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

// Same pointer-tilt physics as TiltedCard.tsx (React Bits), generalized to
// tilt arbitrary content instead of a single <img> — used to make the real
// UI cards themselves tilt, rather than floating a decorative image beside
// them.
const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

type TiltWrapperProps = {
  children: ReactNode;
  className?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
};

export function TiltWrapper({
  children,
  className = "",
  rotateAmplitude = 8,
  scaleOnHover = 1.02
}: TiltWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }

  return (
    <div
      ref={ref}
      className={`h-full ${className}`}
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div className="h-full" style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d" }}>
        {children}
      </motion.div>
    </div>
  );
}
