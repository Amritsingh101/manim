import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, videosApi, authApi } from './client'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

// ── Auth hooks ────────────────────────────────────────────────────────────────
export function useMe() {
  const { token } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then((r) => r.data),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

// ── Video hooks ───────────────────────────────────────────────────────────────
export function useVideos(params) {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: () => videosApi.list(params).then((r) => r.data),
    staleTime: 30 * 1000,
  })
}

export function useVideo(id) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => videosApi.get(id).then((r) => r.data),
    enabled: !!id,
    // Poll while processing
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' || status === 'pending' ? 2000 : false
    },
  })
}

export function useVideoJobs(id) {
  return useQuery({
    queryKey: ['video-jobs', id],
    queryFn: () => videosApi.getJobs(id).then((r) => r.data),
    enabled: !!id,
    refetchInterval: (query) => {
      // Keep polling if any job is running/pending
      const jobs = query.state.data || []
      const active = jobs.some((j) => ['running', 'pending', 'retrying'].includes(j.status))
      return active ? 1500 : false
    },
  })
}

export function useCreateVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => videosApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      toast.success('Video generation started!')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to start generation'
      toast.error(msg)
    },
  })
}

export function useDeleteVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => videosApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] })
      toast.success('Video deleted')
    },
    onError: () => toast.error('Failed to delete video'),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const { setUser } = useAuthStore()
  return useMutation({
    mutationFn: (data) => usersApi.update(data).then((r) => r.data),
    onSuccess: (user) => {
      setUser(user)
      qc.invalidateQueries({ queryKey: ['me'] })
      toast.success('Profile updated!')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Update failed'
      toast.error(msg)
    },
  })
}
