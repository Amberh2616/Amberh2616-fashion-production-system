import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

interface Message {
  id: string
  sender: {
    type: 'user' | 'agent'
    id: string
    name: string
  }
  content: string
  message_type: string
  emotion: string
  is_ai_generated: boolean
  is_read: boolean
  created_at: string
}

interface Conversation {
  id: string
  type: string
  other: {
    type: string
    id: string
    name: string
    avatar?: string
  }
  last_message: string
  last_message_at: string
  unread_count: number
  message_count: number
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const websocket = ref<WebSocket | null>(null)

  async function fetchConversations() {
    loading.value = true
    try {
      const response = await api.get('/api/chat/conversations/')
      conversations.value = response.data.conversations
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchMessages(conversationId: string) {
    loading.value = true
    try {
      const response = await api.get(`/api/chat/conversations/${conversationId}/`)
      messages.value = response.data.messages
      currentConversation.value = conversations.value.find(c => c.id === conversationId) || null
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(conversationId: string, content: string) {
    try {
      const response = await api.post(`/api/chat/conversations/${conversationId}/send/`, {
        content
      })

      // 添加用戶訊息到列表
      messages.value.push({
        id: response.data.message_id,
        sender: { type: 'user', id: '', name: '我' },
        content,
        message_type: 'text',
        emotion: '',
        is_ai_generated: false,
        is_read: true,
        created_at: response.data.created_at
      })

      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  async function startChatWithAgent(agentId: string) {
    try {
      const response = await api.post(`/api/chat/start/${agentId}/`)
      return { success: true, conversationId: response.data.conversation_id }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || '無法開始對話' }
    }
  }

  function connectWebSocket(conversationId: string) {
    const token = localStorage.getItem('token')
    const wsUrl = `ws://localhost:8000/ws/chat/${conversationId}/?token=${token}`

    websocket.value = new WebSocket(wsUrl)

    websocket.value.onopen = () => {
      console.log('WebSocket connected')
    }

    websocket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'message' || data.type === 'ai_response') {
        // 添加新訊息
        messages.value.push(data.message)
      } else if (data.type === 'typing') {
        // 處理打字狀態
        console.log('Typing:', data)
      }
    }

    websocket.value.onclose = () => {
      console.log('WebSocket disconnected')
    }

    websocket.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  function disconnectWebSocket() {
    if (websocket.value) {
      websocket.value.close()
      websocket.value = null
    }
  }

  function addMessage(message: Message) {
    messages.value.push(message)
  }

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startChatWithAgent,
    connectWebSocket,
    disconnectWebSocket,
    addMessage
  }
})
