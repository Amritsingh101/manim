import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: (accessToken, refreshToken, user = null) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        set({ token: accessToken, refreshToken, user, isAuthenticated: true })
      },

      setUser: (user) => {
        if (user) {
          set({ user, isAuthenticated: true })
        } else {
          // Null user = auth failure
          get().logout()
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'manimai-auth',
      // Only persist token strings — user is re-fetched from /users/me
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
