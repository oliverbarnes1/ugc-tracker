import { Layout } from '@/components/layout/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, Eye, DollarSign, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CPMData {
  creator_id: number
  username: string
  display_name: string
  total_posts: number
  total_views: number
  money_earned_so_far: number
  cpm: number
  posts_needed_for_payment: number
  potential_total_earnings: number
}

export default function CPMsPage() {
  // Mock user for development
  const user = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: ''
  }

  const [cpmData, setCpmData] = useState<CPMData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCPMData = async () => {
      try {
        const response = await fetch('/api/cpms/calculate')
        const result = await response.json()
        if (result.success) {
          const sorted = [...result.data].sort((a: any, b: any) => (b.total_views || 0) - (a.total_views || 0))
          setCpmData(sorted)
        }
      } catch (error) {
        console.error('Error fetching CPM data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCPMData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const totalViews = cpmData.reduce((sum, creator) => sum + creator.total_views, 0)
  const totalMoneySpent = cpmData.reduce((sum, creator) => sum + creator.money_earned_so_far, 0)
  const overallCPM = totalViews > 0 ? (totalMoneySpent / totalViews) * 1000 : 0

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CPM Analysis</h1>
          <p className="text-muted-foreground">
            Cost per 1000 views analysis for creators
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cpmData.reduce((sum, creator) => sum + creator.total_posts, 0)}</div>
              <p className="text-xs text-muted-foreground">Across {cpmData.length} creators</p>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalViews)}</div>
              <p className="text-xs text-muted-foreground">All creators combined</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMoneySpent)}</div>
              <p className="text-xs text-muted-foreground">Based on posts made</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall CPM</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overallCPM)}</div>
              <p className="text-xs text-muted-foreground">Per 1000 views</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPM</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(cpmData.length > 0 ? cpmData.reduce((sum, creator) => sum + creator.cpm, 0) / cpmData.length : 0)}</div>
              <p className="text-xs text-muted-foreground">Per creator average</p>
            </CardContent>
          </Card>
        </div>

        {/* Creator CPM Table */}
        <Card>
          <CardHeader>
            <CardTitle>Creator CPM Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading CPM data...</div>
            ) : cpmData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Creator</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Posts</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Views</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Money Earned</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">CPM</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpmData.map((creator) => (
                      <tr key={creator.creator_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">@{creator.username}</div>
                            <div className="text-sm text-gray-500">{creator.display_name}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {creator.total_posts}/60
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatNumber(creator.total_views)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(creator.money_earned_so_far)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(creator.cpm)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className="bg-blue-100 text-blue-800">
                            {Math.round((creator.total_posts / 60) * 100)}%
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

        {/* CPM Calculation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>CPM Calculation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Payment Structure</h4>
                  <p className="text-sm text-gray-600">Each creator earns €500 for 60 videos (€8.33 per video)</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Money Earned So Far</h4>
                  <p className="text-sm text-gray-600">Calculated as: (posts made ÷ 60) × €500</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">CPM Calculation</h4>
                  <p className="text-sm text-gray-600">CPM = (Money earned so far ÷ Total views) × 1000</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
