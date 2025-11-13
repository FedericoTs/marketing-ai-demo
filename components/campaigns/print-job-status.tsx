/**
 * Print Job Status Component
 *
 * Displays print job progress with real-time status updates
 * Simple, engaging UI with visual status indicators
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Printer,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ==================== TYPES ====================

interface PrintJob {
  id: string
  postgrid_job_id: string | null
  api_environment: 'test' | 'live'
  format_type: string
  mail_type: string | null
  total_recipients: number
  recipients_submitted: number | null
  recipients_verified: number | null
  recipients_failed: number | null
  estimated_total_cost: number | null
  actual_total_cost: number | null
  credits_charged: number | null
  status: string
  submitted_at: string | null
  processing_started_at: string | null
  completed_at: string | null
  webhook_events: any[]
  created_at: string
}

interface PrintJobStatusProps {
  campaignId: string
  organizationId: string
}

// ==================== COMPONENT ====================

export function PrintJobStatus({ campaignId, organizationId }: PrintJobStatusProps) {
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  // ==================== FETCH PRINT JOBS ====================

  const fetchPrintJobs = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/print?organizationId=${organizationId}`)
      const data = await response.json()

      if (data.success) {
        setPrintJobs(data.data.printJobs || [])
      }
    } catch (error) {
      console.error('Failed to fetch print jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrintJobs()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPrintJobs, 30000)
    return () => clearInterval(interval)
  }, [campaignId, organizationId])

  // ==================== HELPERS ====================

  const toggleExpanded = (jobId: string) => {
    const newExpanded = new Set(expandedJobs)
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId)
    } else {
      newExpanded.add(jobId)
    }
    setExpandedJobs(newExpanded)
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
      draft: {
        label: 'Draft',
        color: 'text-slate-600',
        icon: Clock,
        bgColor: 'bg-slate-100',
      },
      submitting: {
        label: 'Submitting',
        color: 'text-blue-600',
        icon: RefreshCw,
        bgColor: 'bg-blue-100',
      },
      submitted: {
        label: 'Submitted',
        color: 'text-blue-600',
        icon: CheckCircle2,
        bgColor: 'bg-blue-100',
      },
      processing: {
        label: 'Processing',
        color: 'text-purple-600',
        icon: Package,
        bgColor: 'bg-purple-100',
      },
      in_production: {
        label: 'Printing',
        color: 'text-orange-600',
        icon: Printer,
        bgColor: 'bg-orange-100',
      },
      in_transit: {
        label: 'In Transit',
        color: 'text-indigo-600',
        icon: Truck,
        bgColor: 'bg-indigo-100',
      },
      completed: {
        label: 'Delivered',
        color: 'text-green-600',
        icon: CheckCircle2,
        bgColor: 'bg-green-100',
      },
      failed: {
        label: 'Failed',
        color: 'text-red-600',
        icon: XCircle,
        bgColor: 'bg-red-100',
      },
      partially_failed: {
        label: 'Partial',
        color: 'text-yellow-600',
        icon: XCircle,
        bgColor: 'bg-yellow-100',
      },
    }

    return configs[status] || configs.draft
  }

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">Loading print jobs...</CardContent>
      </Card>
    )
  }

  if (printJobs.length === 0) {
    return null // Don't show anything if no print jobs
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Print Jobs</CardTitle>
              <CardDescription>{printJobs.length} print submission(s)</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchPrintJobs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {printJobs.map((job) => {
          const config = getStatusConfig(job.status)
          const Icon = config.icon
          const isExpanded = expandedJobs.has(job.id)

          return (
            <div key={job.id} className="rounded-lg border border-slate-200 overflow-hidden">
              {/* Summary Row */}
              <div
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpanded(job.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status Badge */}
                    <div className={`${config.bgColor} ${config.color} p-2 rounded-lg`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Job Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{config.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {job.api_environment === 'test' ? 'Test' : 'Live'}
                        </Badge>
                        {job.status === 'submitting' && (
                          <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                        )}
                      </div>

                      <div className="text-sm text-slate-600">
                        {job.total_recipients} postcards
                        {job.actual_total_cost && (
                          <span className="ml-2">• ${job.actual_total_cost.toFixed(2)}</span>
                        )}
                        {job.submitted_at && (
                          <span className="ml-2">
                            • {formatDistanceToNow(new Date(job.submitted_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand Icon */}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Recipients</div>
                      <div className="font-semibold">{job.total_recipients}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-600 mb-1">Submitted</div>
                      <div className="font-semibold text-green-600">
                        {job.recipients_submitted || 0}
                      </div>
                    </div>

                    {job.recipients_failed !== null && job.recipients_failed > 0 && (
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Failed</div>
                        <div className="font-semibold text-red-600">{job.recipients_failed}</div>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-slate-600 mb-1">Credits</div>
                      <div className="font-semibold">${(job.credits_charged || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Configuration */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Format:</span>{' '}
                      <span className="font-medium">{job.format_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Mail Type:</span>{' '}
                      <span className="font-medium">{job.mail_type || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  {job.webhook_events && job.webhook_events.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-3">Status Updates</div>
                        <div className="space-y-2">
                          {job.webhook_events.slice(-5).reverse().map((event: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                              <div className="flex-1">
                                <div className="font-medium">{event.type?.replace('postcard.', '')}</div>
                                <div className="text-xs text-slate-600">
                                  {event.timestamp
                                    ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })
                                    : 'Unknown time'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* PostGrid Job ID */}
                  {job.postgrid_job_id && (
                    <>
                      <Separator />
                      <div className="text-xs text-slate-600">
                        PostGrid Job ID: <code className="text-slate-900">{job.postgrid_job_id}</code>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
