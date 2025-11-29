'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2, CheckCircle2 } from 'lucide-react'
import { PrintCampaignModal } from './print-campaign-modal'
import { toast } from 'sonner'

interface ShowExistingPDFsButtonProps {
  campaignId: string
  organizationId: string
  campaignName: string
  formatType?: string
}

export function ShowExistingPDFsButton({
  campaignId,
  organizationId,
  campaignName,
  formatType = 'postcard_4x6',
}: ShowExistingPDFsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [pdfCount, setPdfCount] = useState<number | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const checkExistingPDFs = async () => {
    setLoading(true)
    try {
      console.log('🔍 [ShowExistingPDFs] Checking for PDFs...')

      const response = await fetch(`/api/campaigns/${campaignId}/stats`)

      if (!response.ok) {
        throw new Error('Failed to load stats')
      }

      const result = await response.json()
      const count = result.data.generatedCount

      console.log(`✅ [ShowExistingPDFs] Found ${count} PDFs`)

      setPdfCount(count)

      if (count > 0) {
        toast.success(`Found ${count} existing PDFs ready to print!`)
        setShowPrintModal(true)
      } else {
        toast.info('No PDFs found. Generate the campaign first.')
      }
    } catch (error) {
      console.error('❌ [ShowExistingPDFs] Error:', error)
      toast.error('Failed to check PDFs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
        <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Campaign Ready
        </h3>
        <p className="text-sm text-slate-600 mb-4 text-center">
          This campaign has been generated. Check for existing PDFs to print.
        </p>

        {pdfCount !== null && pdfCount > 0 && (
          <div className="mb-4 text-center">
            <div className="text-3xl font-bold text-green-600">{pdfCount}</div>
            <div className="text-sm text-slate-600">PDFs Ready</div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={checkExistingPDFs}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Existing PDFs'
            )}
          </Button>

          {pdfCount !== null && pdfCount > 0 && (
            <Button
              onClick={() => setShowPrintModal(true)}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Campaign
            </Button>
          )}
        </div>
      </div>

      {showPrintModal && pdfCount && pdfCount > 0 && (
        <PrintCampaignModal
          isOpen={showPrintModal}
          campaignId={campaignId}
          organizationId={organizationId}
          totalRecipients={pdfCount}
          campaignName={campaignName}
          formatType={formatType}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  )
}
