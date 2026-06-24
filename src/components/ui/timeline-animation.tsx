import React from "react";
import { motion } from "framer-motion";

interface TimelineContentProps {
  as?: any;
  className?: string;
  animationNum?: number;
  customVariants?: any;
  timelineRef?: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}

export function TimelineContent({
  as = "div",
  className = "",
  animationNum = 0,
  customVariants,
  children
}: TimelineContentProps) {
  const MotionComponent = (motion as any)[as] || motion.div;

  return (
    <MotionComponent
      className={className}
      variants={customVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      custom={animationNum}
    >
      {children}
    </MotionComponent>
  );
}
