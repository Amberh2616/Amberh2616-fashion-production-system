<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''

  if (password.value !== passwordConfirm.value) {
    error.value = '密碼不一致'
    return
  }

  if (password.value.length < 8) {
    error.value = '密碼至少需要 8 個字元'
    return
  }

  loading.value = true

  const result = await authStore.register(
    email.value,
    username.value,
    password.value,
    passwordConfirm.value
  )

  if (result.success) {
    router.push('/onboarding')
  } else {
    if (typeof result.error === 'object') {
      error.value = Object.values(result.error).flat().join(', ')
    } else {
      error.value = result.error || '註冊失敗'
    }
  }

  loading.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
      <div class="text-center mb-8">
        <router-link to="/" class="text-3xl font-bold text-purple-600">代理交友</router-link>
        <p class="text-gray-500 mt-2">創建你的帳號</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">電子郵件</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">用戶名</label>
          <input
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="你的名字"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="至少 8 個字元"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
          <input
            v-model="passwordConfirm"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="再次輸入密碼"
          />
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {{ loading ? '註冊中...' : '註冊' }}
        </button>
      </form>

      <div class="mt-6 text-center text-gray-500">
        已有帳號？
        <router-link to="/login" class="text-purple-600 hover:underline">立即登入</router-link>
      </div>
    </div>
  </div>
</template>
