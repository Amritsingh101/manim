import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark', // 'dark' | 'light'
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.setAttribute('data-theme', next)
          return { theme: next }
        }),
      initTheme: () =>
        set((s) => {
          document.documentElement.setAttribute('data-theme', s.theme)
          return s
        }),
    }),
    { name: 'manim-theme' }
  )
)
