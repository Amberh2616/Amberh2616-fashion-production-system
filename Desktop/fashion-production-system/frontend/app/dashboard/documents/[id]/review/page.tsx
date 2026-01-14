'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle2, FileText, AlertCircle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

interface ClassificationPage {
  page: number
  type: string
  confidence: number
  reasoning?: string
}

interface ClassificationResult {
  file_type: string
  total_pages: number
  pages: ClassificationPage[]
}

interface DocumentStatus {
  id: string
  status: string
  filename: string
  classification_result?: ClassificationResult
  extraction_errors: any[]
  file_url?: string
  tech_pack_revision_id?: string  // ⚡ For P0 review navigation
}

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string

  const [status, setStatus] = useState<DocumentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classification: true,
    pages: false,
  })

  useEffect(() => {
    if (!documentId) return
    fetchStatus()
  }, [documentId])

  const fetchStatus = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v2/uploaded-documents/${documentId}/status/`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch document status')
      }

      const data = await response.json()
      setStatus(data)

      // Redirect based on status
      if (data.status === 'uploaded' || data.status === 'classifying') {
        router.push(`/dashboard/documents/${documentId}/processing`)
      } else if (data.status === 'extracted' || data.status === 'completed') {
        // Mark as completed
        setIsCompleted(true)

        // ⚡ Auto-navigate based on file type
        if (data.tech_pack_revision_id) {
          const fileType = data.classification_result?.file_type || 'tech_pack'
          const hasBOM = data.classification_result?.pages?.some((p: ClassificationPage) => p.type === 'bom_table')
          const hasSpec = data.classification_result?.pages?.some((p: ClassificationPage) => p.type === 'measurement_table')

          setTimeout(() => {
            if (fileType === 'bom' || hasBOM) {
              // BOM file → go to BOM edit page
              router.push(`/dashboard/revisions/${data.tech_pack_revision_id}/bom`)
            } else if (fileType === 'measurement' || hasSpec) {
              // Measurement file → go to Spec edit page
              router.push(`/dashboard/revisions/${data.tech_pack_revision_id}/spec`)
            } else {
              // Tech Pack → go to translation review page
              router.push(`/dashboard/revisions/${data.tech_pack_revision_id}/review`)
            }
          }, 2000)  // Wait 2 seconds to show completion message
        }
      }
    } catch (err) {
      console.error('Failed to fetch status:', err)
      setError(err instanceof Error ? err.message : 'Failed to load document')
    }
  }

  const handleExtract = async () => {
    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch(
        `http://localhost:8000/api/v2/uploaded-documents/${documentId}/extract/`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Extraction failed')
      }

      // Poll for extraction completion
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(
          `http://localhost:8000/api/v2/uploaded-documents/${documentId}/status/`
        )
        const statusData = await statusResponse.json()

        if (statusData.status === 'extracted' || statusData.status === 'completed') {
          clearInterval(pollInterval)
          setIsExtracting(false)
          setIsCompleted(true)
          setStatus(statusData)

          // ⚡ Auto-navigate based on file type
          if (statusData.tech_pack_revision_id) {
            const fileType = statusData.classification_result?.file_type || 'tech_pack'
            const hasBOM = statusData.classification_result?.pages?.some((p: ClassificationPage) => p.type === 'bom_table')
            const hasSpec = statusData.classification_result?.pages?.some((p: ClassificationPage) => p.type === 'measurement_table')

            setTimeout(() => {
              if (fileType === 'bom' || hasBOM) {
                // BOM file → go to BOM edit page
                router.push(`/dashboard/revisions/${statusData.tech_pack_revision_id}/bom`)
              } else if (fileType === 'measurement' || hasSpec) {
                // Measurement file → go to Spec edit page
                router.push(`/dashboard/revisions/${statusData.tech_pack_revision_id}/spec`)
              } else {
                // Tech Pack → go to translation review page
                router.push(`/dashboard/revisions/${statusData.tech_pack_revision_id}/review`)
              }
            }, 2000)  // Wait 2 seconds to show success message
          }
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval)
          setIsExtracting(false)
          setError('Extraction failed. Please check the errors and try again.')
        }
      }, 2000)
    } catch (err) {
      console.error('Extraction error:', err)
      setError(err instanceof Error ? err.message : 'Extraction failed')
      setIsExtracting(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      tech_pack: 'bg-blue-100 text-blue-800 border-blue-300',
      bom_table: 'bg-green-100 text-green-800 border-green-300',
      measurement_table: 'bg-purple-100 text-purple-800 border-purple-300',
      cover: 'bg-gray-100 text-gray-800 border-gray-300',
      other: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    }
    return colors[type] || colors.other
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h2 className="font-semibold">Error Loading Document</h2>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/upload')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-600">Loading document...</span>
        </div>
      </div>
    )
  }

  const classification = status.classification_result

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/upload')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </button>
        <h1 className="text-3xl font-bold">Review Classification Results</h1>
        <p className="text-gray-600 mt-2">
          Verify AI classification before proceeding with data extraction
        </p>
      </div>

      {/* File Info */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-gray-500" />
          <div>
            <p className="font-medium">{status.filename}</p>
            <p className="text-sm text-gray-600">Status: {status.status}</p>
          </div>
        </div>
      </div>

      {/* Classification Results */}
      {classification && (
        <div className="space-y-4 mb-6">
          {/* Overall Classification */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('classification')}
              className="w-full p-4 bg-white hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <h3 className="font-semibold">Overall Classification</h3>
                  <p className="text-sm text-gray-600">
                    File Type: <span className="font-medium capitalize">{classification.file_type}</span>
                    {' • '}
                    Total Pages: {classification.total_pages}
                  </p>
                </div>
              </div>
              {expandedSections.classification ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.classification && (
              <div className="p-4 border-t bg-gray-50">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tech Pack Pages', type: 'tech_pack' },
                    { label: 'BOM Pages', type: 'bom_table' },
                    { label: 'Measurement Pages', type: 'measurement_table' },
                  ].map(({ label, type }) => {
                    const count = classification.pages.filter(p => p.type === type).length
                    return (
                      <div key={type} className="p-3 bg-white border rounded-lg">
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Page-by-Page Classification */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('pages')}
              className="w-full p-4 bg-white hover:bg-gray-50 flex items-center justify-between"
            >
              <h3 className="font-semibold">Page-by-Page Classification</h3>
              {expandedSections.pages ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {expandedSections.pages && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {classification.pages.map((page, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg ${getTypeColor(page.type)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Page {page.page}</span>
                        <span className={`text-xs font-medium ${getConfidenceColor(page.confidence)}`}>
                          {(page.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs font-medium capitalize mb-1">
                        {page.type.replace('_', ' ')}
                      </p>
                      {page.reasoning && (
                        <p className="text-xs opacity-75 italic">
                          {page.reasoning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <h2 className="font-semibold">Extraction Completed</h2>
              <p className="text-sm mt-1">
                {status?.tech_pack_revision_id
                  ? 'Redirecting to Tech Pack translation review interface...'
                  : 'Data has been successfully extracted. Ready to create Sample Request.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleExtract}
          disabled={isExtracting || status.status === 'extracting' || isCompleted}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isCompleted
            ? '✓ Extraction Completed'
            : isExtracting || status.status === 'extracting'
            ? 'Extracting Data...'
            : 'Confirm & Extract Data'}
        </button>
        <button
          onClick={() => router.push('/dashboard/upload')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {isCompleted ? 'Back to Upload' : 'Cancel'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-3">Next Steps</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5">1.</span>
            <span>Review the classification results above</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">2.</span>
            <span>Click "Confirm & Extract Data" to proceed with AI extraction</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5">3.</span>
            <span>AI will extract Tech Pack annotations, BOM items, and Measurements</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-yellow-600">⚠</span>
            <span>You'll be able to verify and edit extracted data before creating a Sample Request</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
