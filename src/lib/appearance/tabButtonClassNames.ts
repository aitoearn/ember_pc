import { cn } from "@/lib/utils";

export function emberTabButtonClassName(active: boolean): string {
  return cn(
    "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium transition-[background-color,border-color,color,box-shadow] duration-[180ms] ease-out",
    active
      ? "border-[color:var(--theme-border)] bg-[color:var(--theme-subtle)] text-[color:var(--theme-default)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      : "border-transparent bg-transparent text-[color:var(--ember-text-muted,#9b9b96)] hover:bg-[color:var(--theme-hover)] hover:text-[color:var(--ember-text,#4a4a45)]",
  );
}

/** 迁移期兼容别名，与 limeTabButtonIconClassName 等同文件旧导出名一致 */
export const limeTabButtonClassName = emberTabButtonClassName;

export function limeTabButtonIconClassName(active: boolean): string {
  return cn(
    active
      ? "text-[color:var(--theme-default)]"
      : "text-[color:var(--ember-text-muted,#9b9b96)]",
  );
}

export function limeTabBadgeClassName(
  tone: "default" | "slate" | "sky" | "rose" = "default",
): string {
  if (tone === "rose") {
    return "rounded-[4px] bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700";
  }
  if (tone === "sky") {
    return "rounded-[4px] bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700";
  }
  if (tone === "slate") {
    return "rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600";
  }
  return "rounded-[4px] bg-[color:var(--theme-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--theme-default)]";
}
