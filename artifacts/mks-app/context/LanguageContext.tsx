import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  formatLocalizedDate,
  localizeFieldDescription,
  localizeFieldLabel,
  localizePlaceholder,
  translate,
  translateFieldType,
  translateServiceType,
  translateStatus,
} from "@/lib/i18n";
import { LanguageCode } from "@/types";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: Parameters<typeof translate>[1]) => string;
  formatDate: (date: string | Date | undefined, options?: Intl.DateTimeFormatOptions) => string;
  localizeFieldLabel: typeof localizeFieldLabel;
  localizeFieldDescription: typeof localizeFieldDescription;
  localizePlaceholder: typeof localizePlaceholder;
  translateServiceType: (serviceType: string) => string;
  translateStatus: (status: import("@/types").DocumentStatus) => string;
  translateFieldType: (fieldType: import("@/types").FieldType) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        if (mounted && (value === "my" || value === "en")) {
          setLanguageState(value);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: async (nextLanguage: LanguageCode) => {
      setLanguageState(nextLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    },
    t: (key) => translate(language, key),
    formatDate: (date, options) => formatLocalizedDate(date, language, options),
    localizeFieldLabel,
    localizeFieldDescription,
    localizePlaceholder,
    translateServiceType: (serviceType: string) => translateServiceType(language, serviceType),
    translateStatus: (status) => translateStatus(language, status),
    translateFieldType: (fieldType) => translateFieldType(language, fieldType),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
