/**
 * @file SoundProvider.tsx
 * @description 音效 Provider 组件
 * @module contexts/SoundProvider
 */

import { ReactNode } from "react";
import { useSound } from "../hooks/useSound";
import { SoundContext } from "./soundContext";

export function SoundProvider({ children }: { children: ReactNode }) {
  const sound = useSound();
  return (
    <SoundContext.Provider value={sound}>{children}</SoundContext.Provider>
  );
}
