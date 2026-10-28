import { createContext, useContext } from 'react'

export type Language = 'en' | 'pl'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (text: string) => string
}

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => undefined,
  t: (text) => text,
})

export function useLanguage() {
  return useContext(LanguageContext)
}
