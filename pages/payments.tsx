import { Layout } from '@/components/layout/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PaymentData {
  creator_id: number
  username: string
  display_name: string
  first_post_date: string
  total_posts: number
  posts_needed: number
  days_since_start: number
  estimated_payment_date: string
  posts_per_day: number
  is_ready_for_payment: boolean
  days_until_payment: number
  posts_missed: number
  missed_days: Array<{ date: string; missedCount: number }>
}

export default function PaymentsPage() {
  // Mock user for development
  const user = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: ''
  }

  const [paymentData, setPaymentData] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCreator, setHoveredCreator] = useState<PaymentData | null>(null)
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)

  // Tooltip component for missed posts
  function MissedPostsTooltip({ missedDays, targetRect }: { missedDays: PaymentData['missed_days']; targetRect: DOMRect | null }) {
    if (missedDays.length === 0 || !targetRect) return null;

    const tooltipWidth = 200;
    const tooltipHeight = Math.min(missedDays.length, 8) * 24 + 40;
    const spaceAbove = targetRect.top;
    const spaceBelow = window.innerHeight - targetRect.bottom;

    let top = targetRect.top - tooltipHeight - 8;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Adjust if it goes off screen above
    if (top < 0 && spaceBelow > tooltipHeight) {
      top = targetRect.bottom + 8;
    } else if (top < 0) {
      top = 8;
    }

    // Clamp horizontally
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;

    return (
      <div
        className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-[200px] max-h-60 overflow-y-auto pointer-events-none"
        style={{ top: `${top}px`, left: `${left}px` }}
      >
        <div className="font-semibold mb-2">Missed Posts:</div>
        <div className="space-y-1">
          {missedDays.slice(0, 8).map((day, index) => (
            <div key={index} className="flex items-center justify-between space-x-2">
              <span>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className="text-yellow-400">
                {day.missedCount === 1 ? '1x' : '2x'}
              </span>
            </div>
          ))}
          {missedDays.length > 8 && (
            <div className="text-gray-300 text-xs mt-1">
              ...and {missedDays.length - 8} more days
            </div>
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const response = await fetch('/api/payments/status')
        const result = await response.json()
        if (result.success) {
          const sorted = [...result.data].sort((a: any, b: any) => (b.total_posts || 0) - (a.total_posts || 0))
          setPaymentData(sorted)
        }
      } catch (error) {
        console.error('Error fetching payment data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPaymentData()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getDaysUntilPayment = (data: PaymentData) => {
    if (data.is_ready_for_payment) return 0
    return Math.ceil(data.posts_needed / Math.max(data.posts_per_day, 0.1))
  }

  const getStatusColor = (data: PaymentData) => {
    if (data.is_ready_for_payment) return 'bg-green-100 text-green-800'
    if (data.posts_needed <= 10) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (data: PaymentData) => {
    if (data.is_ready_for_payment) return 'Ready for Payment'
    if (data.posts_needed <= 10) return 'Almost Ready'
    return 'In Progress'
  }

  const totalReadyForPayment = paymentData.filter(d => d.is_ready_for_payment).length
  const totalInProgress = paymentData.filter(d => !d.is_ready_for_payment).length

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Tracking</h1>
          <p className="text-muted-foreground">
            Track creator payment milestones based on 60 posts per month
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Payment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalReadyForPayment}</div>
              <p className="text-xs text-muted-foreground">Creators at 60+ posts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalInProgress}</div>
              <p className="text-xs text-muted-foreground">Still working toward 60</p>
            </CardContent>
          </Card>
        </div>

        {/* Creator Payment Status Table */}
        <Card>
          <CardHeader>
            <CardTitle>Creator Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading payment data...</div>
            ) : paymentData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Creator</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Started</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Posts</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Posts Missed</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Days Since Start</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Days Until Payment</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.map((creator) => (
                      <tr key={creator.creator_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">@{creator.username}</div>
                            <div className="text-sm text-gray-500">{creator.display_name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(creator.first_post_date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {creator.total_posts}/60
                          </div>
                          <div className="text-xs text-gray-500">
                            {creator.posts_needed} more needed
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                            onMouseEnter={(e) => {
                              setHoveredCreator(creator);
                              setHoveredRect(e.currentTarget.getBoundingClientRect());
                            }}
                            onMouseLeave={() => {
                              setHoveredCreator(null);
                              setHoveredRect(null);
                            }}
                          >
                            {creator.posts_missed}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm text-gray-900">
                            {creator.days_since_start} days
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {creator.is_ready_for_payment ? (
                              <span className="text-green-600">Ready!</span>
                            ) : (
                              `${getDaysUntilPayment(creator)} days`
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getStatusColor(creator)}>
                            {getStatusText(creator)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No creator data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Payment Threshold</h4>
                  <p className="text-sm text-gray-600">Creators must reach 60 posts to be eligible for payment</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Posting Schedule</h4>
                  <p className="text-sm text-gray-600">Target: 2 posts per day (60 posts in 30 days)</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Flexible Timeline</h4>
                  <p className="text-sm text-gray-600">Payment is based on post count, not calendar days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Missed Posts Tooltip */}
        {hoveredCreator && (
          <MissedPostsTooltip 
            missedDays={hoveredCreator.missed_days} 
            targetRect={hoveredRect} 
          />
        )}
      </div>
    </Layout>
  )
}
