import type { CrashAnalysisFormState, CrashAnalysisPrefill } from "../types";

export type CrashAnalysisPrefillResult = {
  form: CrashAnalysisFormState;
  /** 压测结果目录，仅用于展示/上下文，不可写入 libraryDir */
  localResultDir?: string;
};

export function applyCrashAnalysisPrefill(
  form: CrashAnalysisFormState,
  prefill: CrashAnalysisPrefill,
): CrashAnalysisPrefillResult {
  return {
    form: {
      crashLogPath: prefill.crashLogPath?.trim() || form.crashLogPath,
      libraryDir: form.libraryDir,
      codeRoot: form.codeRoot,
    },
    localResultDir: prefill.localResultDir?.trim() || undefined,
  };
}
