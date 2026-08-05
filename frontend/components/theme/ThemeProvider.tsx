'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light'
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void }

const THEME_KEY = 'prontusfy-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('theme-light', theme === 'light')
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY)
    const initialTheme: Theme = savedTheme === 'light' ? 'light' : 'dark'
    setThemeState(initialTheme)
    applyTheme(initialTheme)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (nextTheme) => {
      setThemeState(nextTheme)
      window.localStorage.setItem(THEME_KEY, nextTheme)
      applyTheme(nextTheme)
    },
    toggleTheme: () => {
      const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
      setThemeState(nextTheme)
      window.localStorage.setItem(THEME_KEY, nextTheme)
      applyTheme(nextTheme)
    },
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
