import React, { createContext, useContext, useState } from "react";
import { ru } from "./ru";
import { kk } from "./kk";

type Language = "ru" | "kk";
type Translations = typeof ru;

interface I18nContextType {
  lang: Language;
  t: (key: keyof Translations, params?: Record<string, string | number>) => string;
  setLang: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "ru";
  });

  const t = (key: keyof Translations, params?: Record<string, string | number>) => {
    const translations = lang === "ru" ? ru : kk;
    let text = translations[key] || key;
    
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
        text = text.replace(`{{${paramKey}}}`, String(params[paramKey]));
      });
    }
    return text;
  };

  const updateLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  return (
    <I18nContext.Provider value={{ lang, t, setLang: updateLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
