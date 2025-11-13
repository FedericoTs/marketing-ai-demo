/**
 * Print Campaign Modal
 *
 * Two-phase workflow: Preview → Print
 * 1. User generates campaign (creates PDFs)
 * 2. User reviews and submits to PostGrid for printing
 *
 * Features:
 * - Cost estimation before printing
 * - Test/Live environment selection
 * - Return address configuration
 * - Credit balance display and validation
 * - Real-time print status tracking
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Printer,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Mail,
  MapPin,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

interface PrintCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignName: string
  organizationId: string
  totalRecipients: number
  formatType: string
  onPrintComplete?: () => void
}

interface CostEstimate {
  costPerPiece: number
  totalCost: number
  currency: string
  breakdown: {
    printing: number
    postage: number
    addressVerification: number
  }
}

export function PrintCampaignModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  organizationId,
  totalRecipients,
  formatType,
  onPrintComplete,
}: PrintCampaignModalProps) {
  // ==================== STATE ====================
  const [environment, setEnvironment] = useState<'test' | 'live'>('test')
  const [mailType, setMailType] = useState<'usps_first_class' | 'usps_standard'>('usps_first_class')
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [organizationCredits, setOrganizationCredits] = useState<number | null>(null)
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [printResult, setPrintResult] = useState<any>(null)

  // Return address (optional)
  const [useReturnAddress, setUseReturnAddress] = useState(false)
  const [returnAddress, setReturnAddress] = useState({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    provinceOrState: '',
    postalOrZip: '',
  })

  // ==================== EFFECTS ====================

  // Fetch cost estimate when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      fetchCostEstimate()
      fetchOrganizationCredits()
    }
  }, [isOpen, mailType])

  // ==================== API CALLS ====================

  async function fetchCostEstimate() {
    setIsLoadingEstimate(true)
    try {
      // Map formatType to PostGrid size (PostGrid uses width x height)
      const sizeMap: Record<string, string> = {
        postcard_4x6: '6x4',  // PostGrid format: width x height (landscape)
        postcard_6x9: '6x9',
        postcard_6x11: '6x11',
      }
      const size = sizeMap[formatType] || '6x4'

      // For now, use client-side estimation (matches PostGridClient.estimateCost logic)
      // In production, you could call an API endpoint for real-time pricing
      const rates: Record<string, Record<string, number>> = {
        '6x4': { usps_first_class: 0.85, usps_standard: 0.65 },  // 4x6 postcard
        '6x9': { usps_first_class: 1.25, usps_standard: 0.95 },
        '6x11': { usps_first_class: 1.45, usps_standard: 1.15 },
      }

      const costPerPiece = rates[size]?.[mailType] || 1.0
      const totalCost = parseFloat((costPerPiece * totalRecipients).toFixed(2))

      setCostEstimate({
        costPerPiece,
        totalCost,
        currency: 'USD',
        breakdown: {
          printing: costPerPiece * 0.35,
          postage: costPerPiece * 0.6,
          addressVerification: costPerPiece * 0.05,
        },
      })
    } catch (error) {
      console.error('Failed to fetch cost estimate:', error)
      toast.error('Failed to estimate printing costs')
    } finally {
      setIsLoadingEstimate(false)
    }
  }

  async function fetchOrganizationCredits() {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`)
      const data = await response.json()
      if (data.success) {
        setOrganizationCredits(data.data.credits)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
  }

  async function handlePrint() {
    if (!costEstimate) return

    // Validate credits
    if (organizationCredits !== null && organizationCredits < costEstimate.totalCost) {
      toast.error('Insufficient credits for printing')
      return
    }

    setIsPrinting(true)
    setPrintResult(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          environment,
          mailType,
          returnAddress: useReturnAddress ? returnAddress : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Print submission failed')
      }

      setPrintResult(data.data)
      toast.success(`Print job submitted! ${data.data.successCount} postcards sent to production.`)

      // Refresh credits
      fetchOrganizationCredits()

      // Notify parent
      onPrintComplete?.()

      // Auto-close after success (optional)
      setTimeout(() => onClose(), 3000)
    } catch (error) {
      console.error('Print submission failed:', error)
      toast.error(error instanceof Error ? error.message : 'Print submission failed')
    } finally {
      setIsPrinting(false)
    }
  }

  // ==================== DERIVED STATE ====================

  const hasInsufficientCredits =
    organizationCredits !== null && costEstimate !== null && organizationCredits < costEstimate.totalCost

  const canPrint = !isLoadingEstimate && !isPrinting && costEstimate && !hasInsufficientCredits && !printResult

  // ==================== RENDER ====================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Campaign
          </DialogTitle>
          <DialogDescription>
            Submit <strong>{campaignName}</strong> to PostGrid for production printing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ==================== CAMPAIGN SUMMARY ==================== */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Recipients</span>
              <span className="font-semibold">{totalRecipients.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Format</span>
              <Badge variant="outline">{formatType.replace('_', ' ').toUpperCase()}</Badge>
            </div>
            {organizationCredits !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Available Credits</span>
                <span className={`font-semibold ${hasInsufficientCredits ? 'text-destructive' : 'text-primary'}`}>
                  ${organizationCredits.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* ==================== ENVIRONMENT SELECTION ==================== */}
          <div className="space-y-3">
            <Label>Environment</Label>
            <RadioGroup value={environment} onValueChange={(v) => setEnvironment(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="test" id="test" />
                <Label htmlFor="test" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Test Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Sandbox environment - No actual printing or postage charges
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="live" />
                <Label htmlFor="live" className="font-normal cursor-pointer">
                  <div>
                    <div className="font-medium">Live Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Production printing - Real postcards will be printed and mailed
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* ==================== MAIL TYPE ==================== */}
          <div className="space-y-3">
            <Label htmlFor="mailType">Mail Class</Label>
            <Select value={mailType} onValueChange={(v) => setMailType(v as any)}>
              <SelectTrigger id="mailType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usps_first_class">
                  <div>
                    <div className="font-medium">USPS First Class</div>
                    <div className="text-xs text-muted-foreground">Faster delivery (3-5 business days)</div>
                  </div>
                </SelectItem>
                <SelectItem value="usps_standard">
                  <div>
                    <div className="font-medium">USPS Standard</div>
                    <div className="text-xs text-muted-foreground">Cost-effective (7-10 business days)</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* ==================== COST ESTIMATE ==================== */}
          {isLoadingEstimate ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : costEstimate ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Cost Estimate</h4>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Printing</span>
                  <span>${(costEstimate.breakdown.printing * totalRecipients).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Postage</span>
                  <span>${(costEstimate.breakdown.postage * totalRecipients).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address Verification</span>
                  <span>${(costEstimate.breakdown.addressVerification * totalRecipients).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total Cost</span>
                  <span className="text-primary">${costEstimate.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Per Piece</span>
                  <span>${costEstimate.costPerPiece.toFixed(4)}</span>
                </div>
              </div>

              {hasInsufficientCredits && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient credits. You need ${costEstimate.totalCost.toFixed(2)} but only have $
                    {organizationCredits?.toFixed(2)}. Please purchase more credits.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : null}

          {/* ==================== PRINT RESULT ==================== */}
          {printResult && (
            <Alert variant={printResult.failedCount > 0 ? 'default' : 'default'} className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">Print job submitted successfully!</div>
                  <div className="text-sm text-muted-foreground">
                    {printResult.successCount} of {printResult.totalRecipients} postcards sent to production
                  </div>
                  {printResult.failedCount > 0 && (
                    <div className="text-sm text-destructive">{printResult.failedCount} failed</div>
                  )}
                  <div className="text-sm">Credits charged: ${printResult.creditsCharged.toFixed(2)}</div>
                  <div className="text-sm">Remaining credits: ${printResult.remainingCredits.toFixed(2)}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPrinting}>
            {printResult ? 'Close' : 'Cancel'}
          </Button>
          {!printResult && (
            <Button onClick={handlePrint} disabled={!canPrint || isPrinting}>
              {isPrinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  {environment === 'test' ? 'Test Print' : 'Print & Mail'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
