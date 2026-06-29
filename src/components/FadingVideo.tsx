import { useEffect, useRef, CSSProperties } from "react";

interface FadingVideoProps {
  src: string;
  className?: string;
  style?: CSSProperties;
}

export default function FadingVideo({ src, className, style }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeStateRef = useRef<"none" | "in" | "out">("none");
  const opacityRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const FADE_MS = 500;
  const FADE_OUT_LEAD = 0.55; // seconds

  const animateOpacity = (target: number, onComplete?: () => void) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startOpacity = opacityRef.current;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / FADE_MS, 1);
      
      const currentOpacity = startOpacity + (target - startOpacity) * progress;
      opacityRef.current = currentOpacity;
      
      if (videoRef.current) {
        videoRef.current.style.opacity = currentOpacity.toString();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
        if (onComplete) onComplete();
      }
    };

    animationRef.current = requestAnimationFrame(step);
  };

  const startFadeIn = () => {
    fadeStateRef.current = "in";
    animateOpacity(1, () => {
      fadeStateRef.current = "none";
    });
  };

  const startFadeOut = () => {
    fadeStateRef.current = "out";
    animateOpacity(0);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const timeRemaining = video.duration - video.currentTime;
    // When remaining duration is under lead time and we are playing/none-faded
    if (timeRemaining <= FADE_OUT_LEAD && fadeStateRef.current === "none") {
      startFadeOut();
    }
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play().then(() => {
      startFadeIn();
    }).catch((err) => {
      console.warn("Autoplay/play failed on loop restart:", err);
      // Fallback: make sure it is muted and try again
      video.muted = true;
      video.play().then(startFadeIn).catch(console.error);
    });
  };

  const handleCanPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger initial fade in when loaded
    if (opacityRef.current === 0 && fadeStateRef.current === "none") {
      video.play().then(() => {
        startFadeIn();
      }).catch((err) => {
        console.warn("Autoplay failed initially:", err);
      });
    }
  };

  // Ensure playback starts on mount or on source changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.load();
      opacityRef.current = 0;
      video.style.opacity = "0";
      fadeStateRef.current = "none";
      video.play().then(() => {
        startFadeIn();
      }).catch((err) => {
        console.warn("Autoplay on mount/change failed:", err);
      });
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      style={{
        ...style,
        opacity: opacityRef.current,
        transition: "none", // Suppress any CSS transitions to follow spec exactly
      }}
      autoPlay
      muted
      playsInline
      preload="auto"
      onCanPlay={handleCanPlay}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      id={`fading-video-${src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'))}`}
    />
  );
}
