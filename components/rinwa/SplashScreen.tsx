"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function SplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Check if we've already shown the splash in this session
    const hasShownSplash = sessionStorage.getItem("rinwa-splash-shown");

    if (!hasShownSplash) {
      setShowSplash(true);
    //   sessionStorage.setItem("rinwa-splash-shown", "true");

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        // Allow animation to complete before hiding
        setTimeout(() => {
          setShowSplash(false);
        }, 1000);
      }, 3000);

      return () => clearTimeout(timer);
    }

    // DEBUG: Uncomment the line below to always show splash screen for testing
    // setShowSplash(true);
  }, []);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 1000);
  };

  // Door animation variants
  const doorVariants = {
    initial: { width: "50%" },
    animate: { width: "50%" },
    exit: {
      width: 0,
      transition: { duration: 1, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const textVariants = {
    initial: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 0, y: 24, scale: 0.98 },
    animate: shouldReduceMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.95,
            ease: [0.25, 0.46, 0.45, 0.94],
            delay: 0.3,
          },
        },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.98,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash && (
        <motion.div
          initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          onClick={handleDismiss}
          role="presentation"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-[#041114]/50" />

          {/* Left door */}
          <motion.div
            variants={doorVariants}
            initial="initial"
            animate={isAnimatingOut ? "exit" : "animate"}
            className="absolute inset-y-0 left-0 bg-[#041114]"
            style={{ originX: 0 }}
          />

          {/* Right door */}
          <motion.div
            variants={doorVariants}
            initial="initial"
            animate={isAnimatingOut ? "exit" : "animate"}
            className="absolute inset-y-0 right-0 bg-[#041114]"
            style={{ originX: 1 }}
          />

          {/* Content - positioned above doors */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-8 text-center">
            <motion.div
              variants={textVariants}
              initial="initial"
              animate={isAnimatingOut ? "exit" : "animate"}
              className="flex flex-col items-center gap-4"
            >
              {/* Main brand text */}
              <h1 className="font-serif text-[clamp(12.4rem,8vw,5.6rem)] font-black leading-[0.95] tracking-[-0.08em] text-foreground drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                RÌNWÁ
              </h1>

              {/* Subtitle */}
              <p className="font-sans text-[clamp(0.875rem,2.5vw,1.4rem)] font-light tracking-[0.08em] text-foreground/92">
                Hospitality and Experiences
              </p>
            </motion.div>

            {/* Loading indicator / hint */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{
                delay: shouldReduceMotion ? 0 : 2.5,
                duration: 1,
              }}
              className="mt-8 flex items-center gap-2"
            >
              <motion.div
                animate={{ scaleX: [1, 1.1, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="h-0.5 w-1 bg-[#041114]/50"
              />
              <motion.div
                animate={{ scaleX: [1, 1.15, 1] }}
                transition={{
                  duration: 2,
                  delay: 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="h-0.5 w-1 bg-[#041114]/50"
              />
              <motion.div
                animate={{ scaleX: [1, 1.1, 1] }}
                transition={{
                  duration: 2,
                  delay: 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="h-0.5 w-1 bg-[#041114]/50"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}