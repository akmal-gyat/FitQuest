import { motion } from "motion/react";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export default function BlurText({ text, className = "", delay = 0.5 }: BlurTextProps) {
  // Split by spaces to animate words
  const words = text.split(" ");

  return (
    <h1 className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-center select-none ${className}`}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ filter: "blur(10px)", opacity: 0, y: 25 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1], // Custom ultra-smooth easeOutExpo cubic-bezier
            delay: delay + index * 0.08,
          }}
          className="inline-block"
          style={{ willChange: "filter, opacity, transform" }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}
