import React, { createContext, useState, useContext, ReactNode } from 'react';
import { translations } from './translations';

type LanguageType = 'English' | 'Tamil';

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<LanguageType>('English');

  const t = (key: string): string => {
    // Return translation if exists, otherwise fallback to the key itself or English translation
    if (translations[language] && (translations[language] as any)[key]) {
      return (translations[language] as any)[key];
    }
    if (translations['English'] && (translations['English'] as any)[key]) {
      return (translations['English'] as any)[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
