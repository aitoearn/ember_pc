/**
 * @file soundContext.ts
 * @description 音效上下文定义
 * @module contexts/soundContext
 */

import { createContext } from "react";
import type { UseSoundReturn } from "../hooks/useSound";

export const SoundContext = createContext<UseSoundReturn | null>(null);
