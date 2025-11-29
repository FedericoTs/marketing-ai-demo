'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, Loader2, User, Mail, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Recipient {
  id: string
  recipientId: string
  name: string
  email: string | null
  phone: string | null
  address: string
  trackingCode: string
  qrCodeUrl: string | null
  pdfUrl: string | null
  landingPageUrl: string | null
  status: string
  createdAt: string
}

interface CampaignRecipientsTableProps {
  campaignId: string
  totalRecipients: number
  onLoad?: (recipientsCount: number) => void
}

export function CampaignRecipientsTable({
  campaignId,
  totalRecipients,
  onLoad,
}: CampaignRecipientsTableProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchRecipients(true) // true = reset to first page
  }, [campaignId])

  const fetchRecipients = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setRecipients([])
      } else {
        setLoadingMore(true)
      }
      setError(null)

      // OPTIMIZATION: Use pagination (50 recipients per page)
      const offset = reset ? 0 : recipients.length
      const limit = 50
      const response = await fetch(
        `/api/campaigns/${campaignId}/recipients?limit=${limit}&offset=${offset}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recipients')
      }

      // Append new recipients (or reset if first page)
      setRecipients(prev => reset ? data.recipients : [...prev, ...data.recipients])
      setTotal(data.total)
      setHasMore(data.hasMore)

      if (onLoad) {
        onLoad(data.total)
      }

      console.log(`✅ Loaded ${data.recipients.length} recipients (${offset + data.recipients.length}/${data.total})`)
    } catch (err) {
      console.error('❌ Error fetching recipients:', err)
      setError(err instanceof Error ? err.message : 'Failed to load recipients')
      toast.error('Failed to load recipient list')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleDownloadPDF = async (recipient: Recipient) => {
    if (!recipient.pdfUrl) {
      toast.error('PDF not available')
      return
    }

    try {
      window.open(recipient.pdfUrl, '_blank')
      toast.success(`Opening PDF for ${recipient.name}`)
    } catch (err) {
      console.error('Error opening PDF:', err)
      toast.error('Failed to open PDF')
    }
  }

  const handleOpenLandingPage = (recipient: Recipient) => {
    if (!recipient.landingPageUrl) {
      toast.error('Landing page not available')
      return
    }

    const fullUrl = recipient.landingPageUrl.startsWith('http')
      ? recipient.landingPageUrl
      : `${window.location.origin}${recipient.landingPageUrl}`

    window.open(fullUrl, '_blank')
    toast.success(`Opening landing page for ${recipient.name}`)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-sm text-slate-600">Loading recipients...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-900 font-semibold">Error loading recipients</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecipients()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recipients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <p>No recipients found for this campaign.</p>
            <p className="text-sm mt-1">Generate the campaign to see recipients here.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-purple-600" />
          Generated Mail Pieces ({recipients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Address
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recipients.map((recipient) => (
                <tr
                  key={recipient.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-700">
                          {recipient.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {recipient.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Code: {recipient.trackingCode.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm space-y-1">
                      {recipient.email && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">
                            {recipient.email}
                          </span>
                        </div>
                      )}
                      {recipient.phone && (
                        <div className="text-slate-600">{recipient.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1 text-sm text-slate-600">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{recipient.address}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(recipient)}
                        disabled={!recipient.pdfUrl}
                        title="Download PDF"
                        className="h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLandingPage(recipient)}
                        disabled={!recipient.landingPageUrl}
                        title="Open Landing Page"
                        className="h-8"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Page
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer with Load More */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
            <div>
              Showing {recipients.length} of {total} total recipients
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchRecipients(true)}>
              Refresh
            </Button>
          </div>

          {/* Load More Button */}
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecipients(false)}
              disabled={loadingMore}
              className="w-full"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Loading more...
                </>
              ) : (
                <>Load More ({total - recipients.length} remaining)</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
