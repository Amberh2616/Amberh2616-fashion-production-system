'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, FileSpreadsheet, X, AlertCircle } from 'lucide-react'

interface UploadedFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  progress: number
  error?: string
  documentId?: string
}

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }, [])

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
    }))

    setFiles(prev => [...prev, ...uploadedFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      // Update status to uploading
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      )

      // Create FormData
      const formData = new FormData()
      formData.append('file', uploadedFile.file)

      // Upload file
      const response = await fetch('http://localhost:8000/api/v2/uploaded-documents/', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()

      // Update status to uploaded
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'uploaded' as const,
                progress: 100,
                documentId: data.id,
              }
            : f
        )
      )

      return data.id
    } catch (error) {
      console.error('Upload error:', error)
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      )
      return null
    }
  }

  const handleUploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')

    // Upload all files
    const uploadPromises = pendingFiles.map(f => uploadFile(f))
    const documentIds = await Promise.all(uploadPromises)

    // Filter out failed uploads
    const successfulIds = documentIds.filter(id => id !== null) as string[]

    if (successfulIds.length > 0) {
      // Navigate to processing page for first document
      router.push(`/dashboard/documents/${successfulIds[0]}/processing`)
    }
  }

  const handleClearAll = () => {
    setFiles([])
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const uploadedCount = files.filter(f => f.status === 'uploaded').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Upload Tech Pack / BOM / Spec</h1>
          <p className="text-gray-600 mt-2">
            Drop PDF or Excel files, AI will automatically identify and extract content
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={pendingCount === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Upload & Process ({pendingCount})
          </button>
        )}
      </div>

      {/* Dropzone */}
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            Drop files here
          </p>
          <p className="text-sm text-gray-500">or</p>
          <label className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer font-medium">
            Choose Files
            <input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Supported: PDF, Excel (.xlsx, .xls) · Max 50MB
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Selected Files ({files.length})
            </h2>
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Clear All
            </button>
          </div>

          {/* Status Summary */}
          {(uploadedCount > 0 || errorCount > 0) && (
            <div className="mb-4 flex gap-4 text-sm">
              {uploadedCount > 0 && (
                <span className="text-green-600">
                  ✓ {uploadedCount} Uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-600">
                  ✗ {errorCount} Failed
                </span>
              )}
            </div>
          )}

          <div className="space-y-2">
            {files.map(uploadedFile => (
              <div
                key={uploadedFile.id}
                className={`border rounded-lg p-4 ${
                  uploadedFile.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : uploadedFile.status === 'uploaded'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(uploadedFile.file.name)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadedFile.file.size)}
                        {uploadedFile.status === 'uploading' && (
                          <span className="ml-2">Uploading...</span>
                        )}
                        {uploadedFile.status === 'uploaded' && (
                          <span className="ml-2 text-green-600">
                            ✓ Uploaded
                          </span>
                        )}
                        {uploadedFile.status === 'error' && (
                          <span className="ml-2 text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {uploadedFile.error}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="ml-4 p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Progress bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
          <span className="text-xl">📌</span>
          System Will Automatically
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>AI identifies content types (Tech Pack / BOM / Measurement)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Extract Tech Pack annotations with translation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Extract BOM (Bill of Materials)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">✓</span>
            <span>Extract Measurement specifications</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-yellow-600">⚠</span>
            <span>After extraction, please verify data accuracy</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
