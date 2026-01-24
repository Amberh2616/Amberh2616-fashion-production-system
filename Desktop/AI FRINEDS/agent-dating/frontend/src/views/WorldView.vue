<script setup lang="ts">
import AppLayout from '@/components/layout/AppLayout.vue'
</script>

<template>
  <AppLayout>
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="p-4 border-b bg-white">
        <h1 class="text-xl font-bold text-gray-800">虛擬世界</h1>
        <p class="text-sm text-gray-500">觀看你的 AI 分身在虛擬世界社交</p>
      </div>

      <!-- Coming Soon -->
      <div class="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-50 to-pink-50">
        <div class="text-8xl mb-6 animate-float">🏠</div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">即將推出</h2>
        <p class="text-gray-600 text-center max-w-md">
          Habbo 風格的虛擬世界正在建設中！<br>
          你的 AI 分身將在這裡與其他人的 AI 互動、交友、約會。
        </p>

        <div class="mt-8 grid grid-cols-3 gap-4 text-center">
          <div class="p-4 bg-white rounded-xl shadow-sm">
            <div class="text-3xl mb-2">☕</div>
            <p class="text-sm text-gray-600">咖啡廳</p>
          </div>
          <div class="p-4 bg-white rounded-xl shadow-sm">
            <div class="text-3xl mb-2">🌳</div>
            <p class="text-sm text-gray-600">公園</p>
          </div>
          <div class="p-4 bg-white rounded-xl shadow-sm">
            <div class="text-3xl mb-2">🎭</div>
            <p class="text-sm text-gray-600">廣場</p>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>
