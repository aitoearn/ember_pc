export const A2UI_RENDERER_TOKENS = {
  container: "a2ui-container space-y-1.5",
  thinkingText: "text-[12px] text-[color:var(--ember-text-muted)] italic",
  errorText: "text-rose-600",
  submitRow: "mt-1.5 flex justify-end border-t border-slate-200 pt-2",
  submitButton:
    "inline-flex h-8 items-center justify-center rounded-[8px] border border-neutral-900 bg-neutral-900 px-3 text-[12px] font-medium text-white shadow-none transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-neutral-200 disabled:text-neutral-500 disabled:hover:bg-neutral-200",
  textVariants: {
    h1: "text-[16px] font-semibold leading-6 text-[color:var(--ember-text-strong)]",
    h2: "text-[15px] font-semibold leading-6 text-[color:var(--ember-text-strong)]",
    h3: "text-[14px] font-semibold leading-5 text-[color:var(--ember-text-strong)]",
    h4: "text-[13px] font-semibold leading-5 text-[color:var(--ember-text-strong)]",
    h5: "text-[13px] font-medium leading-5 text-[color:var(--ember-text-strong)]",
    body: "text-[12px] leading-5 text-[color:var(--ember-text)]",
    caption: "text-[12px] leading-4 text-[color:var(--ember-text-muted)]",
  },
  imageBase:
    "block border border-[color:var(--ember-surface-border)] bg-[color:var(--ember-surface-soft)] object-cover",
  imagePlaceholder:
    "flex items-center justify-center border border-dashed border-[color:var(--ember-surface-border-strong)] bg-[color:var(--ember-surface-soft)] text-xs text-[color:var(--ember-text-muted)]",
  imageFit: {
    contain: "object-contain",
    cover: "object-cover",
    fill: "object-fill",
    none: "object-none",
    "scale-down": "object-scale-down",
  },
  imageVariants: {
    default: "w-full min-h-[96px] rounded-[12px]",
    icon: "h-8 w-8 rounded-[10px] p-1.5",
    avatar: "h-8 w-8 rounded-full",
    smallFeature: "w-full h-20 rounded-[12px]",
    mediumFeature: "w-full h-28 rounded-[12px]",
    largeFeature: "w-full h-40 rounded-[12px]",
    header: "w-full h-36 rounded-[12px]",
  },
  iconShell:
    "inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-slate-200 bg-white text-[color:var(--ember-text-muted)] shadow-none",
  iconFallback: "text-[10px] font-medium uppercase tracking-[0.08em]",
} as const;

export default A2UI_RENDERER_TOKENS;
