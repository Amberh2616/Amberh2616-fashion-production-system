<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import api from '@/services/api'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()
const chatStore = useChatStore()

interface Match {
  user_id: string
  username: string
  match_score: number
  highlights: string[]
  agent: {
    id: string
    name: string
    avatar_look: string
    bio: string
  } | null
}

const matches = ref<Match[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await api.get('/api/match/recommendations/')
    matches.value = response.data.recommendations
  } catch (error) {
    console.error('Failed to fetch matches:', error)
  } finally {
    loading.value = false
  }
})

async function startChat(match: Match) {
  if (!match.agent) {
    alert('對方尚未創建 AI 分身')
    return
  }

  const result = await chatStore.startChatWithAgent(match.agent.id)
  if (result.success) {
    router.push(`/chat/${result.conversationId}`)
  } else {
    alert(result.error)
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-purple-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-gray-600'
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-4 border-b bg-white">
        <h1 class="text-xl font-bold text-gray-800">靈魂配對</h1>
        <p class="text-sm text-gray-500">找到與你靈魂相近的人</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="matches.length === 0"
        class="flex-1 flex flex-col items-center justify-center p-8"
      >
        <div class="text-6xl mb-4">💜</div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">暫無配對推薦</h2>
        <p class="text-gray-500 text-center">
          完成你的靈魂問卷，讓我們為你找到合適的人！
        </p>
      </div>

      <!-- Match List -->
      <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
        <div
          v-for="match in matches"
          :key="match.user_id"
          class="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <div class="p-4">
            <div class="flex items-start gap-4">
              <!-- Avatar -->
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl flex-shrink-0">
                {{ match.agent?.name?.[0] || match.username?.[0] || '?' }}
              </div>

              <!-- Info -->
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-gray-800">{{ match.agent?.name || match.username }}</h3>
                  <span
                    class="text-sm font-medium px-2 py-0.5 rounded-full bg-purple-50"
                    :class="getScoreColor(match.match_score)"
                  >
                    {{ match.match_score }}% 匹配
                  </span>
                </div>

                <p v-if="match.agent?.bio" class="text-sm text-gray-500 mt-1 line-clamp-2">
                  {{ match.agent.bio }}
                </p>

                <!-- Highlights -->
                <div v-if="match.highlights.length > 0" class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="(highlight, idx) in match.highlights"
                    :key="idx"
                    class="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full"
                  >
                    {{ highlight }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-4">
              <button
                @click="startChat(match)"
                :disabled="!match.agent"
                class="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                💬 開始聊天
              </button>
              <button
                class="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                💜
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
