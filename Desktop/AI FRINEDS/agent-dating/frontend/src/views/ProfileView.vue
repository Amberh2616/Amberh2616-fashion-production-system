<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()

interface SoulProfile {
  worldview: any
  personality: any
  interests: any
  values: any
}

const soulProfile = ref<SoulProfile | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get('/api/user/soul-profile/')
    soulProfile.value = response.data
  } catch (error) {
    console.error('Failed to fetch soul profile:', error)
  } finally {
    loading.value = false
  }
})

function logout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-full overflow-y-auto">
      <!-- Header -->
      <div class="p-4 border-b bg-white">
        <h1 class="text-xl font-bold text-gray-800">我的</h1>
      </div>

      <!-- Profile Card -->
      <div class="p-4">
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl">
              {{ authStore.user?.username?.[0] || '?' }}
            </div>
            <div>
              <h2 class="text-xl font-bold text-gray-800">{{ authStore.user?.username }}</h2>
              <p class="text-gray-500">{{ authStore.user?.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Soul Profile -->
      <div v-if="!loading && soulProfile" class="p-4 space-y-4">
        <h3 class="font-semibold text-gray-800">靈魂檔案</h3>

        <!-- Personality -->
        <div class="bg-white rounded-xl p-4 shadow-sm">
          <h4 class="text-sm font-medium text-gray-500 mb-2">性格</h4>
          <p class="text-lg">{{ soulProfile.personality?.mbti || 'XXXX' }}</p>
          <p class="text-sm text-gray-600">{{ soulProfile.personality?.socialStyle }}</p>
        </div>

        <!-- Interests -->
        <div class="bg-white rounded-xl p-4 shadow-sm">
          <h4 class="text-sm font-medium text-gray-500 mb-2">興趣</h4>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="interest in soulProfile.interests?.categories || []"
              :key="interest"
              class="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm"
            >
              {{ interest }}
            </span>
          </div>
        </div>

        <!-- Values -->
        <div class="bg-white rounded-xl p-4 shadow-sm">
          <h4 class="text-sm font-medium text-gray-500 mb-2">核心價值</h4>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="value in soulProfile.values?.core || []"
              :key="value"
              class="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm"
            >
              {{ value }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex-1 flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>

      <!-- Actions -->
      <div class="p-4 mt-auto">
        <button
          @click="logout"
          class="w-full py-3 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  </AppLayout>
</template>
