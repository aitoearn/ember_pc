import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { CORE_NAMESPACES, loadBundledI18nResources } from "./loadNamespace";
import {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  normalizeLocale,
  resolveDocumentDirection,
  type SupportedLocale,
} from "./locales";

const resources = loadBundledI18nResources();

function syncDocumentLocale(locale: SupportedLocale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = resolveDocumentDirection(locale);
}

export function initEmberI18n(initialLocale?: string | null): typeof i18n {
  if (i18n.isInitialized) {
    if (initialLocale === undefined) {
      syncDocumentLocale(normalizeLocale(i18n.language));
      return i18n;
    }

    const locale = normalizeLocale(initialLocale);
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    syncDocumentLocale(locale);
    return i18n;
  }

  const locale = normalizeLocale(initialLocale);

  i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: FALLBACK_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    defaultNS: "common",
    fallbackNS: "common",
    ns: [...CORE_NAMESPACES],
    resources,
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      bindI18nStore: "added",
      useSuspense: false,
    },
  });

  syncDocumentLocale(locale);
  return i18n;
}

export async function changeEmberLocale(
  nextLocale?: string | null,
): Promise<SupportedLocale> {
  const locale = normalizeLocale(nextLocale);
  initEmberI18n(locale);
  await i18n.changeLanguage(locale);
  syncDocumentLocale(locale);
  return locale;
}

export function getEmberI18n() {
  return initEmberI18n();
}

export { resources as emberI18nResources };
