export type ThemeColorName =
  | "default"
  | "purple"
  | "cyan"
  | "blue"
  | "orange"
  | "red";

export interface ThemeColorPreset {
  name: ThemeColorName;
  label: string;
  lighter: string;
  light: string;
  default: string;
  dark: string;
  darker: string;
}

export const themePresets: Record<ThemeColorName, ThemeColorPreset> = {
  default: {
    name: "default",
    label: "默认绿",
    lighter: "#C8FAD6",
    light: "#5BE49B",
    default: "#00A76F",
    dark: "#007867",
    darker: "#004B50",
  },
  purple: {
    name: "purple",
    label: "紫罗兰",
    lighter: "#EBD6FD",
    light: "#B985F4",
    default: "#7635DC",
    dark: "#431A9E",
    darker: "#200A69",
  },
  cyan: {
    name: "cyan",
    label: "青蓝色",
    lighter: "#CCF4FE",
    light: "#68CDF9",
    default: "#078DEE",
    dark: "#0351AB",
    darker: "#012972",
  },
  blue: {
    name: "blue",
    label: "蔚蓝色",
    lighter: "#D1E9FC",
    light: "#76B0F1",
    default: "#2065D1",
    dark: "#103996",
    darker: "#061B64",
  },
  orange: {
    name: "orange",
    label: "橙黄色",
    lighter: "#FEF4D4",
    light: "#FED680",
    default: "#FDA92D",
    dark: "#B66816",
    darker: "#793908",
  },
  red: {
    name: "red",
    label: "珊瑚红",
    lighter: "#FFE3D5",
    light: "#FF9882",
    default: "#FF3030",
    dark: "#B71833",
    darker: "#7A0930",
  },
};

export const themeColorNames: ThemeColorName[] = [
  "default",
  "purple",
  "cyan",
  "blue",
  "orange",
  "red",
];

export function getThemePreset(name: ThemeColorName): ThemeColorPreset {
  return themePresets[name] ?? themePresets.default;
}
