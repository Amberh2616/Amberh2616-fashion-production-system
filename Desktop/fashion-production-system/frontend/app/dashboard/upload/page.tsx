'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UploadProgress {
  filename: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  message?: string
  type?: string
}

export default function MultiFileUploadPage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [revisionId, setRevisionId] = useState<string>('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    )

    if (droppedFiles.length === 0) {
      alert('請上傳 PDF 檔案')
      return
    }

    await handleFiles(droppedFiles)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    const pdfFiles = Array.from(selectedFiles).filter(
      file => file.type === 'application/pdf'
    )

    if (pdfFiles.length === 0) {
      alert('請上傳 PDF 檔案')
      return
    }

    await handleFiles(pdfFiles)
  }

  const handleFiles = async (uploadFiles: File[]) => {
    setUploading(true)

    // Initialize progress tracking
    const initialProgress: UploadProgress[] = uploadFiles.map(file => ({
      filename: file.name,
      status: 'pending',
      progress: 0
    }))
    setFiles(initialProgress)

    // Step 1: Create a new revision if not exists
    let currentRevisionId = revisionId

    if (!currentRevisionId) {
      try {
        const timestamp = new Date().toISOString().slice(0, 10)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v2/styles/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            style_number: `AUTO-${timestamp}-${Date.now()}`,
            style_name: 'Multi-file Upload',
            season: 'SS25',
            category: 'apparel'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create style')
        }

        const styleData = await response.json()

        // Create revision
        const revisionResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v2/styles/${styleData.id}/create-revision/`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              revision_label: 'Rev A'
            })
          }
        )

        if (!revisionResponse.ok) {
          throw new Error('Failed to create revision')
        }

        const revisionData = await revisionResponse.json()
        currentRevisionId = revisionData.id
        setRevisionId(currentRevisionId)
      } catch (error) {
        console.error('Failed to create revision:', error)
        alert('創建 Revision 失敗')
        setUploading(false)
        return
      }
    }

    // Step 2: Upload each file
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]

      // Update status to uploading
      setFiles(prev =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading', progress: 10 } : f
        )
      )

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('revision_id', currentRevisionId)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v2/upload-and-parse/`,
          {
            method: 'POST',
            body: formData
          }
        )

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const result = await response.json()

        // Update status to success
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  type: result.file_type,
                  message: `已識別為 ${result.file_type} 類型`
                }
              : f
          )
        )
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)

        // Update status to error
        setFiles(prev =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error',
                  progress: 0,
                  message: error instanceof Error ? error.message : '上傳失敗'
                }
              : f
          )
        )
      }
    }

    setUploading(false)

    // Redirect to revision page after all uploads complete
    if (currentRevisionId) {
      setTimeout(() => {
        router.push(`/dashboard/revisions/${currentRevisionId}`)
      }, 2000)
    }
  }

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return '⏳'
      case 'uploading':
        return '🔄'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
    }
  }

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500'
      case 'uploading':
        return 'text-blue-500'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">上傳 Tech Pack 文件</h1>
        <p className="text-gray-600 mt-2">
          支援多個 PDF 檔案上傳，系統會自動識別類型並解析翻譯
        </p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700">
            拖曳多個 PDF 檔案到這裡，或點擊選擇
          </p>
          <p className="text-sm text-gray-500 mt-2">
            支援：Tech Pack、BOM、Spec、Construction PDF
          </p>
        </label>
      </div>

      {/* Upload Progress */}
      {files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">上傳進度</h2>
          <div className="space-y-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getStatusIcon(file.status)}</span>
                    <span className="font-medium">{file.filename}</span>
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(file.status)}`}>
                    {file.status === 'pending' && '等待中'}
                    {file.status === 'uploading' && '上傳中'}
                    {file.status === 'success' && '完成'}
                    {file.status === 'error' && '失敗'}
                  </span>
                </div>

                {/* Progress Bar */}
                {file.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Message */}
                {file.message && (
                  <p className="text-sm text-gray-600 mt-2">{file.message}</p>
                )}

                {/* File Type Badge */}
                {file.type && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {file.type.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Redirect Message */}
          {files.every(f => f.status === 'success' || f.status === 'error') && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                ✅ 所有檔案上傳完成！正在跳轉到編輯頁面...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">使用說明</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• 支援同時上傳多個 PDF 檔案</li>
          <li>• 系統會自動識別 PDF 類型（BOM / Spec / Construction / Tech Pack）</li>
          <li>• 所有內容會自動翻譯成中文（使用 AI 翻譯）</li>
          <li>• 上傳完成後會自動跳轉到編輯頁面，您可以檢查和修正翻譯</li>
        </ul>
      </div>
    </div>
  )
}
