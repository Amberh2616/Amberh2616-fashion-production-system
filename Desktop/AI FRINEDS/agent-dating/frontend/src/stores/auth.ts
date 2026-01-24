import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

interface User {
  id: string
  email: string
  username: string
  avatar_url: string | null
  onboarding_completed: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  function checkAuth() {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      token.value = savedToken
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
      fetchUser()
    }
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const response = await api.post('/api/auth/token/', { email, password })
      token.value = response.data.access
      localStorage.setItem('token', response.data.access)
      localStorage.setItem('refreshToken', response.data.refresh)
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`
      await fetchUser()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.detail || '登入失敗' }
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, username: string, password: string, passwordConfirm: string) {
    loading.value = true
    try {
      await api.post('/api/auth/register/', {
        email,
        username,
        password,
        password_confirm: passwordConfirm
      })
      // 註冊成功後自動登入
      return await login(email, password)
    } catch (error: any) {
      return { success: false, error: error.response?.data || '註冊失敗' }
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    try {
      const response = await api.get('/api/user/profile/')
      user.value = response.data
    } catch (error) {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    checkAuth,
    login,
    register,
    fetchUser,
    logout
  }
})
