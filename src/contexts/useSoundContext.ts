/**
 * @file useSoundContext.ts
 * @description 音效上下文 Hook
 * @module contexts/useSoundContext
 */

import { useContext } from "react";
import { SoundContext } from "./soundContext";
import type { UseSoundReturn } from "../hooks/useSound";

export function useSoundContext(): UseSoundReturn {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSoundContext must be used within a SoundProvider");
  }
  return context;
}
