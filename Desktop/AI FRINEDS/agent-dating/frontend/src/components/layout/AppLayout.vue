<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const navItems = [
  { path: '/chat', icon: '💬', label: '聊天' },
  { path: '/matches', icon: '💜', label: '配對' },
  { path: '/world', icon: '🏠', label: '世界' },
  { path: '/profile', icon: '👤', label: '我的' },
]

const isActive = (path: string) => computed(() => route.path === path || route.path.startsWith(path + '/'))
</script>

<template>
  <div class="flex flex-col h-screen bg-gray-50">
    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="bg-white border-t safe-bottom">
      <div class="flex justify-around">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center py-3 px-6 transition-colors"
          :class="isActive(item.path).value ? 'text-purple-600' : 'text-gray-400'"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span class="text-xs mt-1">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
