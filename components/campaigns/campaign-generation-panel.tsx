'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Download, AlertCircle, CheckCircle2, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { PrintCampaignModal } from './print-campaign-modal'
import { CampaignRecipientsTable } from './campaign-recipients-table'

interface CampaignGenerationPanelProps {
  campaignId: string
  organizationId: string
  totalRecipients: number
  campaignName: string
  formatType?: string
  campaignStatus?: string
  generatedCount?: number
  onGenerationComplete?: () => void
}

interface GenerationProgress {
  current: number
  total: number
  percentage: number
  currentRecipient: string | null
  status: 'idle' | 'processing' | 'completed' | 'failed'
}

interface GenerationError {
  recipientId: string
  recipientName: string
  error: string
}

export function CampaignGenerationPanel({
  campaignId,
  organizationId,
  totalRecipients,
  campaignName,
  formatType = 'postcard_4x6',
  campaignStatus,
  generatedCount = 0,
  onGenerationComplete,
}: CampaignGenerationPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: totalRecipients,
    percentage: 0,
    currentRecipient: null,
    status: 'idle',
  })
  const [result, setResult] = useState<{
    successCount: number
    failureCount: number
    duration: number
    errors: GenerationError[]
  } | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showRecipients, setShowRecipients] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if campaign has existing PDFs on mount (use props from parent)
  React.useEffect(() => {
    console.log('🔍 [CampaignGenerationPanel] Checking for existing results', {
      campaignStatus,
      generatedCount,
      totalRecipients
    })

    const shouldShowResults =
      (campaignStatus === 'completed' || campaignStatus === 'sent' || campaignStatus === 'sending') &&
      generatedCount > 0

    console.log('🎯 [CampaignGenerationPanel] Should show results?', shouldShowResults)

    if (shouldShowResults) {
      console.log(`✅ [CampaignGenerationPanel] Campaign status: ${campaignStatus}, showing ${generatedCount} existing PDFs`)

      // Set progress to completed state
      setProgress({
        current: generatedCount,
        total: totalRecipients,
        percentage: 100,
        currentRecipient: null,
        status: 'completed',
      })

      // Set result to show print button
      setResult({
        successCount: generatedCount,
        failureCount: Math.max(0, totalRecipients - generatedCount),
        duration: 0,
        errors: [],
      })

      console.log('✅ [CampaignGenerationPanel] State updated - print button should now be visible!')
      setShowRecipients(true) // Show recipients table for existing campaigns
    }
  }, [campaignStatus, generatedCount, totalRecipients]) // Watch for prop changes

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  // Poll campaign stats during generation
  const startProgressPolling = () => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    console.log('🔄 [Progress Polling] Starting real-time progress updates...')

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/stats`)
        const data = await response.json()

        if (response.ok && data.success) {
          const { generatedCount: currentCount, status } = data.stats

          // Update progress
          setProgress((prev) => ({
            ...prev,
            current: currentCount,
            percentage: Math.round((currentCount / totalRecipients) * 100),
          }))

          console.log(`📊 [Progress Polling] ${currentCount}/${totalRecipients} (${Math.round((currentCount / totalRecipients) * 100)}%)`)

          // Stop polling when complete
          if (status === 'completed' || status === 'failed') {
            console.log('✅ [Progress Polling] Campaign completed, stopping polling')
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          }
        }
      } catch (error) {
        console.error('❌ [Progress Polling] Error:', error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const stopProgressPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log('🛑 [Progress Polling] Stopped')
    }
  }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setProgress({
        current: 0,
        total: totalRecipients,
        percentage: 0,
        currentRecipient: null,
        status: 'processing',
      })
      setResult(null)
      setShowRecipients(false)

      console.log('🚀 Starting campaign generation...')

      // Start progress polling
      startProgressPolling()

      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      })

      const data = await response.json()

      // Stop polling when API returns
      stopProgressPolling()

      if (!response.ok) {
        throw new Error(data.message || 'Generation failed')
      }

      // Success!
      setProgress({
        current: data.data.totalRecipients,
        total: data.data.totalRecipients,
        percentage: 100,
        currentRecipient: null,
        status: 'completed',
      })

      setResult({
        successCount: data.data.successCount,
        failureCount: data.data.failureCount,
        duration: data.data.duration,
        errors: data.data.errors || [],
      })

      // Show recipients table
      setShowRecipients(true)

      // Notify parent component that generation completed
      if (onGenerationComplete) {
        onGenerationComplete()
      }

      if (data.data.failureCount > 0) {
        toast.warning(
          `Generation complete with ${data.data.failureCount} error${data.data.failureCount > 1 ? 's' : ''}`
        )
      } else {
        toast.success('🎉 All designs generated successfully!')
      }

      console.log('✅ Generation complete:', data.data)
    } catch (error) {
      console.error('❌ Generation error:', error)

      stopProgressPolling()
      setProgress((prev) => ({ ...prev, status: 'failed' }))

      toast.error(error instanceof Error ? error.message : 'Failed to generate campaign')
    } finally {
      setIsGenerating(false)
    }
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Sparkles className="h-5 w-5 text-purple-600" />
    }
  }

  const getStatusText = () => {
    switch (progress.status) {
      case 'processing':
        return 'Generating personalized designs...'
      case 'completed':
        return 'Generation complete!'
      case 'failed':
        return 'Generation failed'
      default:
        return 'Ready to generate'
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'processing':
        return 'text-blue-700 bg-blue-50'
      case 'completed':
        return 'text-green-700 bg-green-50'
      case 'failed':
        return 'text-red-700 bg-red-50'
      default:
        return 'text-slate-700 bg-slate-50'
    }
  }

  return (
    <Card className="border-2 border-dashed border-purple-200 hover:border-purple-300 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Campaign Generation</CardTitle>
              <CardDescription>
                Create {totalRecipients} personalized design{totalRecipients !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>

          {progress.status === 'idle' && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Campaign
            </Button>
          )}
        </div>
      </CardHeader>

      {(progress.status !== 'idle' || result) && (
        <CardContent className="space-y-4">
          {/* Status Banner */}
          <div className={`rounded-lg p-4 flex items-center gap-3 ${getStatusColor()}`}>
            {getStatusIcon()}
            <div className="flex-1">
              <p className="font-semibold">{getStatusText()}</p>
              {progress.currentRecipient && (
                <p className="text-sm opacity-75 mt-0.5">
                  Processing: {progress.currentRecipient}
                </p>
              )}
            </div>
            {result && (
              <div className="text-right">
                <div className="font-semibold">{result.successCount}/{progress.total}</div>
                <div className="text-xs opacity-75">{result.duration.toFixed(1)}s</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress.status === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-slate-900">
                  {progress.current} / {progress.total} ({progress.percentage}%)
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Success Summary */}
          {result && progress.status === 'completed' && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{result.successCount}</div>
                  <div className="text-sm text-slate-600">Successful</div>
                </div>
                {result.failureCount > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{result.failureCount}</div>
                    <div className="text-sm text-slate-600">Failed</div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Generated in {result.duration.toFixed(1)} seconds
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Download All
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowPrintModal(true)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Printer className="h-3 w-3 mr-1" />
                    Print Campaign
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Errors List */}
          {result && result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold text-red-900">
                  {result.errors.length} Error{result.errors.length > 1 ? 's' : ''}
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="text-sm bg-white rounded p-2 border border-red-100">
                    <div className="font-medium text-red-900">{error.recipientName}</div>
                    <div className="text-red-700 mt-0.5">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry Button */}
          {progress.status === 'failed' && (
            <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" className="w-full">
              <Loader2 className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              Retry Generation
            </Button>
          )}
        </CardContent>
      )}

      {/* Recipients Table - Show after generation completes */}
      {showRecipients && progress.status === 'completed' && (
        <div className="mt-6">
          <CampaignRecipientsTable
            campaignId={campaignId}
            totalRecipients={totalRecipients}
          />
        </div>
      )}

      {/* Print Campaign Modal */}
      <PrintCampaignModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        campaignId={campaignId}
        campaignName={campaignName}
        organizationId={organizationId}
        totalRecipients={totalRecipients}
        formatType={formatType}
        onPrintComplete={() => {
          toast.success('Print job submitted successfully!')
        }}
      />
    </Card>
  )
}
