'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ProcessingStatus {
  id: string
  status: string
  filename: string
  classification_result?: {
    file_type: string
    total_pages: number
    pages: Array<{
      page: number
      type: string
      confidence: number
    }>
  }
  extraction_errors: any[]
  progress: {
    uploaded: boolean
    classified: boolean
    extracted: boolean
  }
}

// 格式化時間
function formatElapsedTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

export default function ProcessingPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isCancelled, setIsCancelled] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!documentId || isCancelled) return

    // Reset start time
    startTimeRef.current = Date.now()
    abortControllerRef.current = new AbortController()

    // Auto-trigger classification when page loads
    triggerClassification()

    // Poll status every 2 seconds
    const statusInterval = setInterval(pollStatus, 2000)

    // Update elapsed time every second
    const timeInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(timeInterval)
      abortControllerRef.current?.abort()
    }
  }, [documentId, isCancelled])

  const handleCancel = () => {
    setIsCancelled(true)
    abortControllerRef.current?.abort()
    router.push('/dashboard/upload')
  }

  const triggerClassification = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v2/uploaded-documents/${documentId}/classify/`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Classification failed')
      }
    } catch (err) {
      console.error('Failed to trigger classification:', err)
      setError(err instanceof Error ? err.message : 'Classification failed')
    }
  }

  const pollStatus = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v2/uploaded-documents/${documentId}/status/`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch status')
      }

      const data = await response.json()
      setStatus(data)

      // Redirect when classification is complete - 立即跳轉
      if (data.status === 'classified') {
        toast.success('AI 分類完成！', {
          description: `共 ${data.classification_result?.total_pages || 0} 頁`
        })
        router.push(`/dashboard/documents/${documentId}/review`)
      }

      // Handle failed status
      if (data.status === 'failed') {
        toast.error('AI 處理失敗')
        setError('AI processing failed. Please try again.')
      }
    } catch (err) {
      console.error('Failed to poll status:', err)
    }
  }

  const handleRetry = () => {
    setError(null)
    setRetryCount((prev) => prev + 1)
    setElapsedTime(0)
    startTimeRef.current = Date.now()
    toast.info('重新開始處理...')
    triggerClassification()
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h2 className="font-semibold">處理失敗</h2>
              <p className="text-sm mt-1">{error}</p>
              {retryCount > 0 && (
                <p className="text-xs mt-1 text-red-600">已重試 {retryCount} 次</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              重試
            </button>
            <button
              onClick={() => router.push('/dashboard/upload')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              返回上傳
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  const currentStep = status.status

  // 根據頁數估算時間（每頁約 3-5 秒）
  const estimatedTime = status.classification_result
    ? Math.max(30, status.classification_result.total_pages * 4)
    : 60

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Processing</h1>
            <p className="text-gray-600 mt-2">
              分析檔案: {status.filename}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <XCircle className="h-5 w-5" />
            取消
          </button>
        </div>

        {/* 時間顯示 */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-blue-600">
            <Clock className="h-4 w-4" />
            <span>已花時間: {formatElapsedTime(elapsedTime)}</span>
          </div>
          {!status.progress.classified && (
            <div className="text-gray-500">
              預估總時間: ~{formatElapsedTime(estimatedTime)}
            </div>
          )}
          {elapsedTime > 120 && !status.progress.classified && (
            <div className="text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              處理時間較長，請耐心等待...
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1: Upload */}
        <StatusItem
          label="1. File Upload"
          status={status.progress.uploaded ? 'completed' : 'processing'}
          message={status.progress.uploaded ? 'Upload complete' : 'Uploading...'}
        />

        {/* Step 2: Classification */}
        <StatusItem
          label="2. AI File Classification (Smart Page Detection)"
          status={
            status.progress.classified
              ? 'completed'
              : currentStep === 'classifying'
              ? 'processing'
              : 'pending'
          }
          message={
            status.progress.classified && status.classification_result
              ? `Identified as ${status.classification_result.file_type} (${status.classification_result.total_pages} pages)`
              : currentStep === 'classifying'
              ? 'AI is analyzing file...'
              : undefined
          }
        >
          {status.progress.classified && status.classification_result && (
            <div className="ml-12 mt-3 space-y-1 text-sm">
              <p className="text-gray-600">Page classification results:</p>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {status.classification_result.pages.slice(0, 10).map((page, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-gray-100 rounded text-xs flex justify-between"
                  >
                    <span>Page {page.page}</span>
                    <span className="font-medium capitalize">{page.type}</span>
                  </div>
                ))}
                {status.classification_result.pages.length > 10 && (
                  <div className="col-span-2 text-center text-gray-500">
                    ... {status.classification_result.pages.length - 10} more pages
                  </div>
                )}
              </div>
            </div>
          )}
        </StatusItem>

        {/* Step 3: Extraction */}
        <StatusItem
          label="3. AI Content Extraction"
          status={
            status.progress.extracted
              ? 'completed'
              : currentStep === 'extracting'
              ? 'processing'
              : 'pending'
          }
          message={
            status.progress.extracted
              ? 'Extraction complete, preparing review page...'
              : currentStep === 'extracting'
              ? 'Extracting Tech Pack, BOM, Measurement...'
              : undefined
          }
        />
      </div>

      {/* Success Message */}
      {status.progress.classified && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">AI classification complete! Redirecting to review page...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// StatusItem Component
interface StatusItemProps {
  label: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  children?: React.ReactNode
}

function StatusItem({ label, status, message, children }: StatusItemProps) {
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'processing':
        return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
    }
  }

  const getBorderColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200'
      case 'processing':
        return 'border-blue-200'
      case 'failed':
        return 'border-red-200'
      default:
        return 'border-gray-200'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getBorderColor()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <p className="font-medium">{label}</p>
          {message && (
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
