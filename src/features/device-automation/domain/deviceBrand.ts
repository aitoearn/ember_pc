export interface DeviceBrandInput {
  name: string;
  model?: string;
  brand?: string;
  manufacturer?: string;
}

const BRAND_KEYWORD_RULES: { pattern: RegExp; label: string }[] = [
  { pattern: /huawei|华为/i, label: "华为" },
  { pattern: /honor|荣耀/i, label: "荣耀" },
  { pattern: /xiaomi|小米|redmi|红米/i, label: "小米" },
  { pattern: /oppo/i, label: "OPPO" },
  { pattern: /vivo/i, label: "vivo" },
  { pattern: /oneplus|一加/i, label: "OnePlus" },
  { pattern: /samsung|三星/i, label: "Samsung" },
  { pattern: /iphone|apple|苹果/i, label: "Apple" },
  { pattern: /google|pixel/i, label: "Google" },
  { pattern: /meizu|魅族/i, label: "魅族" },
];

/** 常见华为/荣耀机型代号前缀（adb model 不含品牌名时使用） */
const HUAWEI_MODEL_PREFIXES = new Set([
  "HBP",
  "ALN",
  "ALP",
  "ANA",
  "ANG",
  "BAL",
  "BLK",
  "BRQ",
  "CLS",
  "COL",
  "COR",
  "CDY",
  "DUA",
  "DVC",
  "EBG",
  "ELS",
  "EML",
  "EVA",
  "FRL",
  "GLK",
  "HMA",
  "JAD",
  "JEF",
  "JNY",
  "LIO",
  "LNA",
  "LYA",
  "MAR",
  "MGA",
  "MHA",
  "MNA",
  "MRX",
  "NAM",
  "NCO",
  "NOH",
  "OCE",
  "OXF",
  "PAR",
  "PCT",
  "POT",
  "SEA",
  "TAS",
  "VCE",
  "VOG",
  "YAL",
]);

const KNOWN_BRAND_LABELS: Record<string, string> = {
  huawei: "华为",
  honor: "荣耀",
  xiaomi: "小米",
  redmi: "Redmi",
  oppo: "OPPO",
  vivo: "vivo",
  oneplus: "OnePlus",
  samsung: "Samsung",
  apple: "Apple",
  google: "Google",
  meizu: "魅族",
};

export function normalizeBrandLabel(raw?: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const mapped = KNOWN_BRAND_LABELS[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

function extractModelPrefix(value: string): string | undefined {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }
  const head = normalized.split(/[\s_-]/)[0]?.trim();
  return head || undefined;
}

function isHuaweiModelCode(value: string): boolean {
  const prefix = extractModelPrefix(value);
  return prefix ? HUAWEI_MODEL_PREFIXES.has(prefix) : false;
}

function matchBrandKeyword(corpus: string): string | undefined {
  for (const rule of BRAND_KEYWORD_RULES) {
    if (rule.pattern.test(corpus)) {
      return rule.label;
    }
  }
  return undefined;
}

/** 推断设备品牌展示名，优先 adb 属性，其次名称/型号关键词与代号映射。 */
export function inferDeviceBrand(input: DeviceBrandInput): string {
  const fromProp =
    normalizeBrandLabel(input.brand) ?? normalizeBrandLabel(input.manufacturer);
  if (fromProp) {
    return fromProp;
  }

  const name = input.name.trim();
  const model = input.model?.trim() ?? "";
  const corpus = `${name} ${model}`.trim();

  if (!corpus) {
    return "—";
  }

  const keywordBrand = matchBrandKeyword(corpus);
  if (keywordBrand) {
    return keywordBrand;
  }

  if (isHuaweiModelCode(name) || isHuaweiModelCode(model)) {
    return "华为";
  }

  const firstToken = name.split(/\s+/)[0]?.trim();
  if (
    firstToken &&
    /^[A-Za-z0-9._-]+$/.test(firstToken) &&
    firstToken.length <= 24
  ) {
    return normalizeBrandLabel(firstToken) ?? firstToken;
  }

  return "—";
}
