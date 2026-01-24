<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import AppLayout from '@/components/layout/AppLayout.vue'

const router = useRouter()
const chatStore = useChatStore()

const loading = ref(true)

onMounted(async () => {
  await chatStore.fetchConversations()
  loading.value = false
})

function openConversation(conversationId: string) {
  router.push(`/chat/${conversationId}`)
}

function formatTime(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return '剛剛'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`
  return date.toLocaleDateString('zh-TW')
}
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-4 border-b bg-white">
        <h1 class="text-xl font-bold text-gray-800">聊天</h1>
        <p class="text-sm text-gray-500">和感興趣的人的 AI 分身聊天</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="chatStore.conversations.length === 0"
        class="flex-1 flex flex-col items-center justify-center p-8"
      >
        <div class="text-6xl mb-4">💬</div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">還沒有對話</h2>
        <p class="text-gray-500 text-center mb-6">
          去配對頁面找到感興趣的人，<br>開始和他們的 AI 分身聊天吧！
        </p>
        <router-link
          to="/matches"
          class="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
        >
          瀏覽配對
        </router-link>
      </div>

      <!-- Conversation List -->
      <div v-else class="flex-1 overflow-y-auto">
        <div
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          @click="openConversation(conv.id)"
          class="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer border-b transition-colors"
        >
          <!-- Avatar -->
          <div class="relative">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xl">
              {{ conv.other.name?.[0] || '?' }}
            </div>
            <span
              v-if="conv.other.type === 'agent'"
              class="absolute -bottom-1 -right-1 text-xs bg-purple-100 text-purple-600 px-1.5 rounded-full"
            >
              AI
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="font-medium text-gray-800">{{ conv.other.name }}</h3>
              <span class="text-xs text-gray-400">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <p class="text-sm text-gray-500 truncate">{{ conv.last_message || '開始對話吧' }}</p>
          </div>

          <!-- Unread Badge -->
          <div v-if="conv.unread_count > 0" class="ml-2">
            <span class="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
              {{ conv.unread_count > 9 ? '9+' : conv.unread_count }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
