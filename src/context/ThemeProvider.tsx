import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext } from './themeContext'

export type Theme = 'light' | 'dark'

const themeStorageKey = 'careeros-theme-v1'

function readTheme(): Theme {
  try {
    return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'
  } catch (error) {
    console.warn('CareerOS could not read the saved theme preference.', error)
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(themeStorageKey, theme)
    } catch (error) {
      console.error('CareerOS could not persist the theme preference.', error)
    }
  }, [theme])

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
