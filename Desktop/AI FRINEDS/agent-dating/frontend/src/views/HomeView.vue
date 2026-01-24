<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

const isLoggedIn = computed(() => authStore.isAuthenticated)

function goToChat() {
  if (isLoggedIn.value) {
    router.push('/chat')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
    <!-- Header -->
    <header class="p-6 flex justify-between items-center">
      <h1 class="text-2xl font-bold text-purple-600">代理交友</h1>
      <div class="space-x-4">
        <template v-if="isLoggedIn">
          <router-link to="/chat" class="text-gray-600 hover:text-purple-600">聊天</router-link>
          <router-link to="/matches" class="text-gray-600 hover:text-purple-600">配對</router-link>
          <router-link to="/profile" class="text-gray-600 hover:text-purple-600">我的</router-link>
        </template>
        <template v-else>
          <router-link to="/login" class="text-gray-600 hover:text-purple-600">登入</router-link>
          <router-link
            to="/register"
            class="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            註冊
          </router-link>
        </template>
      </div>
    </header>

    <!-- Hero Section -->
    <main class="container mx-auto px-6 py-16">
      <div class="text-center max-w-3xl mx-auto">
        <!-- 動畫圖示 -->
        <div class="relative w-48 h-48 mx-auto mb-8">
          <div class="absolute inset-0 bg-purple-200 rounded-full animate-pulse-slow opacity-50"></div>
          <div class="absolute inset-4 bg-purple-300 rounded-full animate-pulse-slow opacity-50" style="animation-delay: 0.5s"></div>
          <div class="absolute inset-8 bg-purple-400 rounded-full flex items-center justify-center">
            <span class="text-6xl">💜</span>
          </div>
        </div>

        <h2 class="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
          讓 AI 分身<br>幫你找到靈魂伴侶
        </h2>

        <p class="text-xl text-gray-600 mb-8">
          創建你的 AI 分身，讓它代替你社交、認識朋友、尋找戀人。<br>
          基於三觀、興趣、性格的深度配對，找到真正合適的人。
        </p>

        <button
          @click="goToChat"
          class="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg rounded-full hover:shadow-lg transform hover:scale-105 transition-all"
        >
          {{ isLoggedIn ? '開始聊天' : '立即體驗' }}
        </button>
      </div>

      <!-- 特色功能 -->
      <div class="grid md:grid-cols-3 gap-8 mt-20">
        <div class="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div class="text-4xl mb-4">🎭</div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">AI 分身</h3>
          <p class="text-gray-600">
            回答問卷，建立你的靈魂檔案。AI 分身將代表你的個性、價值觀和興趣，在虛擬世界中社交。
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div class="text-4xl mb-4">💞</div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">靈魂配對</h3>
          <p class="text-gray-600">
            基於三觀契合、興趣相似、性格匹配的深度算法，找到與你靈魂相近的人。
          </p>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div class="text-4xl mb-4">💬</div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">AI 先聊</h3>
          <p class="text-gray-600">
            在認識真人前，先和對方的 AI 分身聊天。了解他/她的想法、性格，再決定是否認識本人。
          </p>
        </div>
      </div>

      <!-- 使用流程 -->
      <div class="mt-20 text-center">
        <h3 class="text-2xl font-bold text-gray-800 mb-10">如何運作？</h3>
        <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center">1</span>
            <span class="text-gray-700">填寫靈魂問卷</span>
          </div>
          <span class="hidden md:block text-gray-400">→</span>
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center">2</span>
            <span class="text-gray-700">創建 AI 分身</span>
          </div>
          <span class="hidden md:block text-gray-400">→</span>
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center">3</span>
            <span class="text-gray-700">AI 自動社交</span>
          </div>
          <span class="hidden md:block text-gray-400">→</span>
          <div class="flex items-center gap-3">
            <span class="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center">4</span>
            <span class="text-gray-700">認識真人</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="py-8 text-center text-gray-500 text-sm">
      © 2026 代理交友 - AI 代理社交平台
    </footer>
  </div>
</template>
