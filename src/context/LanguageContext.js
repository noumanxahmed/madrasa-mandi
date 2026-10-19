import React, { createContext, useState, useContext } from "react";
import en from "../locales/en.json";
import ur from "../locales/ur.json";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState("ur"); // Default Urdu for Pakistani farmers

  const toggleLanguage = () => {
    setLocale((prev) => (prev === "en" ? "ur" : "en"));
  };

  const t = (key) => {
    const keys = key.split(".");
    let current = locale === "ur" ? ur : en;
    for (let k of keys) {
      if (!current[k]) return key;
      current = current[k];
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ locale, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
