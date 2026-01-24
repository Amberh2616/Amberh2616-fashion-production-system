<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const currentStep = ref(0)
const answers = ref<Record<number, any>>({})
const loading = ref(false)

// 問卷題目（簡化版本，完整版從 API 獲取）
const questions = [
  {
    id: 1,
    question: '你認為人生最重要的是什麼？',
    type: 'multiple',
    options: [
      { value: 'happiness', label: '追求快樂和享受生活' },
      { value: 'achievement', label: '實現自我和達成目標' },
      { value: 'helping', label: '幫助他人和貢獻社會' },
      { value: 'experience', label: '體驗世界和拓展視野' },
    ],
    maxSelect: 2,
  },
  {
    id: 2,
    question: '面對困難時，你通常會怎麼想？',
    type: 'scale',
    leftLabel: '事情總會變好的',
    rightLabel: '需要務實面對現實',
  },
  {
    id: 7,
    question: '週末你最想做什麼？',
    type: 'multiple',
    options: [
      { value: 'outdoors', label: '戶外活動' },
      { value: 'social', label: '社交活動' },
      { value: 'creative', label: '創作活動' },
      { value: 'learning', label: '學習活動' },
      { value: 'relaxing', label: '放鬆活動' },
    ],
    maxSelect: 2,
  },
  {
    id: 12,
    question: '在聚會中，你通常是...？',
    type: 'scale',
    leftLabel: '主動找人聊天',
    rightLabel: '等待別人來找我',
  },
  {
    id: 14,
    question: '什麼讓你感到被理解和被關心？',
    type: 'multiple',
    options: [
      { value: 'words', label: '聽到肯定和鼓勵的話' },
      { value: 'time', label: '對方花時間陪伴我' },
      { value: 'gifts', label: '收到貼心的禮物' },
      { value: 'help', label: '對方主動幫助我' },
    ],
    maxSelect: 2,
  },
]

const currentQuestion = computed(() => questions[currentStep.value])
const progress = computed(() => ((currentStep.value + 1) / questions.length) * 100)
const canProceed = computed(() => {
  const answer = answers.value[currentQuestion.value.id]
  if (currentQuestion.value.type === 'scale') {
    return answer !== undefined
  }
  return answer && answer.length > 0
})

function selectMultiple(value: string) {
  const qId = currentQuestion.value.id
  if (!answers.value[qId]) {
    answers.value[qId] = []
  }

  const index = answers.value[qId].indexOf(value)
  if (index > -1) {
    answers.value[qId].splice(index, 1)
  } else if (answers.value[qId].length < (currentQuestion.value.maxSelect || 2)) {
    answers.value[qId].push(value)
  }
}

function isSelected(value: string) {
  const answer = answers.value[currentQuestion.value.id]
  return answer && answer.includes(value)
}

function setScale(value: number) {
  answers.value[currentQuestion.value.id] = value
}

function nextStep() {
  if (currentStep.value < questions.length - 1) {
    currentStep.value++
  } else {
    submitQuestionnaire()
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function submitQuestionnaire() {
  loading.value = true

  const responses = Object.entries(answers.value).map(([qId, answer]) => ({
    question_id: parseInt(qId),
    answer,
  }))

  try {
    await api.post('/api/auth/questionnaire/', { responses })
    router.push('/chat')
  } catch (error) {
    console.error('Failed to submit questionnaire:', error)
    alert('提交失敗，請重試')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex flex-col">
    <!-- Progress Bar -->
    <div class="h-1 bg-gray-200">
      <div
        class="h-full bg-purple-600 transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Header -->
    <div class="p-4 text-center">
      <h1 class="text-xl font-bold text-gray-800">靈魂問卷</h1>
      <p class="text-sm text-gray-500">{{ currentStep + 1 }} / {{ questions.length }}</p>
    </div>

    <!-- Question -->
    <div class="flex-1 flex flex-col items-center justify-center p-6">
      <div class="w-full max-w-lg">
        <h2 class="text-2xl font-semibold text-gray-800 text-center mb-8">
          {{ currentQuestion.question }}
        </h2>

        <!-- Multiple Choice -->
        <div v-if="currentQuestion.type === 'multiple'" class="space-y-3">
          <button
            v-for="option in currentQuestion.options"
            :key="option.value"
            @click="selectMultiple(option.value)"
            class="w-full p-4 border-2 rounded-xl text-left transition-all"
            :class="isSelected(option.value)
              ? 'border-purple-600 bg-purple-50'
              : 'border-gray-200 hover:border-purple-300'"
          >
            <span class="flex items-center gap-3">
              <span
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                :class="isSelected(option.value) ? 'border-purple-600 bg-purple-600' : 'border-gray-300'"
              >
                <svg v-if="isSelected(option.value)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </span>
              {{ option.label }}
            </span>
          </button>
          <p class="text-sm text-gray-500 text-center mt-2">
            可選擇 {{ currentQuestion.maxSelect || 2 }} 項
          </p>
        </div>

        <!-- Scale -->
        <div v-else-if="currentQuestion.type === 'scale'" class="space-y-6">
          <div class="flex justify-between text-sm text-gray-600">
            <span>{{ currentQuestion.leftLabel }}</span>
            <span>{{ currentQuestion.rightLabel }}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            :value="answers[currentQuestion.id] ?? 50"
            @input="setScale(Number(($event.target as HTMLInputElement).value))"
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div class="text-center text-2xl">
            {{ answers[currentQuestion.id] ?? 50 }}
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="p-4 flex gap-4">
      <button
        v-if="currentStep > 0"
        @click="prevStep"
        class="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
      >
        上一題
      </button>
      <button
        @click="nextStep"
        :disabled="!canProceed || loading"
        class="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {{ currentStep === questions.length - 1 ? (loading ? '提交中...' : '完成') : '下一題' }}
      </button>
    </div>
  </div>
</template>
