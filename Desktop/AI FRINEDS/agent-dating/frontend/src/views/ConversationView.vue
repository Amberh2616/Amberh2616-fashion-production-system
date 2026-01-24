<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()

const conversationId = route.params.conversationId as string
const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const isTyping = ref(false)
const loading = ref(true)

onMounted(async () => {
  await chatStore.fetchMessages(conversationId)
  chatStore.connectWebSocket(conversationId)
  loading.value = false
  scrollToBottom()
})

onUnmounted(() => {
  chatStore.disconnectWebSocket()
})

watch(() => chatStore.messages.length, () => {
  nextTick(() => scrollToBottom())
})

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

async function sendMessage() {
  const content = newMessage.value.trim()
  if (!content) return

  newMessage.value = ''
  isTyping.value = true

  const result = await chatStore.sendMessage(conversationId, content)

  if (!result.success) {
    console.error('Failed to send message')
  }

  // AI 回覆中的狀態
  setTimeout(() => {
    isTyping.value = false
  }, 3000)
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
}

function goBack() {
  router.push('/chat')
}
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Header -->
    <div class="flex items-center gap-4 p-4 bg-white border-b">
      <button @click="goBack" class="p-2 hover:bg-gray-100 rounded-full">
        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div v-if="chatStore.currentConversation" class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
          {{ chatStore.currentConversation.other.name?.[0] || '?' }}
        </div>
        <div>
          <h2 class="font-medium text-gray-800">{{ chatStore.currentConversation.other.name }}</h2>
          <span v-if="chatStore.currentConversation.other.type === 'agent'" class="text-xs text-purple-600">
            AI 分身
          </span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>

    <!-- Messages -->
    <div v-else ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Empty State -->
      <div v-if="chatStore.messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="text-5xl mb-4">👋</div>
        <p>開始你們的對話吧！</p>
      </div>

      <!-- Message List -->
      <div
        v-for="message in chatStore.messages"
        :key="message.id"
        class="flex message-enter-active"
        :class="message.sender.type === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[75%] px-4 py-2 rounded-2xl"
          :class="message.sender.type === 'user'
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'"
        >
          <p class="whitespace-pre-wrap">{{ message.content }}</p>
          <div
            class="text-xs mt-1"
            :class="message.sender.type === 'user' ? 'text-purple-200' : 'text-gray-400'"
          >
            {{ formatTime(message.created_at) }}
            <span v-if="message.is_ai_generated" class="ml-1">• AI</span>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="flex justify-start">
        <div class="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
          <div class="typing-indicator flex gap-1">
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="p-4 bg-white border-t">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input
          v-model="newMessage"
          type="text"
          placeholder="輸入訊息..."
          class="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:border-purple-400"
        />
        <button
          type="submit"
          :disabled="!newMessage.trim()"
          class="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          發送
        </button>
      </form>
    </div>
  </div>
</template>
