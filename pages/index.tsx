import { Layout } from '@/components/layout/layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  MessageSquare,
  Eye,
  Heart,
  Share2,
  Clock,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
// Removed recharts import - using custom chart instead

interface DashboardData {
  totalPosts: number
  totalCreators: number
  totalViews: number
  totalLikes: number
  topPosts: Array<{
    id: number
    caption: string
    post_url: string
    thumbnail_url: string
    published_at: string
    username: string
    display_name: string
    views: number
    likes: number
    comments: number
    shares: number
  }>
  creatorStats: Array<{
    username: string
    display_name: string
    post_count: number
    total_views: number
    total_likes: number
    avg_views: number
  }>
  dailyViews: {
    last7Days: Array<{
      date: string
      views: number
    }>
    last30Days: Array<{
      date: string
      views: number
    }>
    allTime: Array<{
      date: string
      views: number
    }>
  }
}

export default function Dashboard() {
  // Mock user for development
  const user = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: ''
  }
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visiblePosts, setVisiblePosts] = useState(8)
  const [syncing, setSyncing] = useState(false)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<'last7Days' | 'last30Days' | 'allTime'>('last7Days')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [sortField, setSortField] = useState<'views' | 'likes' | 'shares' | 'published_at'>('views')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const fetchDashboardData = async () => {
    try {
      // Use demo API for production deployment
      const apiEndpoint = process.env.NODE_ENV === 'production' 
        ? '/api/dashboard/stats-demo' 
        : '/api/dashboard/stats'
      
      const response = await fetch(apiEndpoint)
      const result = await response.json()
      if (result.success) {
        setDashboardData(result.data)
        setVisiblePosts(8) // Reset to show 8 posts initially
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (process.env.NODE_ENV === 'production') {
      alert('Sync functionality is disabled in demo mode. This feature requires a database connection.')
      return
    }
    
    setSyncing(true)
    try {
      const response = await fetch('/api/cron/run', {
        method: 'POST',
        headers: {
          'x-cron-key': 'super-secret-123456789'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        // Refresh dashboard data after successful sync
        await fetchDashboardData()
        alert(`Sync completed! Processed ${result.processed} items with ${result.errors} errors.`)
      } else {
        alert('Sync failed. Please try again.')
      }
    } catch (error) {
      console.error('Error syncing data:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const handleShowMore = () => {
    setVisiblePosts(prev => prev + 16) // Show 16 more posts
  }

  const handleSort = (field: 'views' | 'likes' | 'shares' | 'published_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortedPosts = () => {
    if (!dashboardData?.topPosts) return []
    
    return [...dashboardData.topPosts].sort((a, b) => {
      let aValue, bValue
      
      switch (sortField) {
        case 'views':
          aValue = a.views || 0
          bValue = b.views || 0
          break
        case 'likes':
          aValue = a.likes || 0
          bValue = b.likes || 0
          break
        case 'shares':
          aValue = a.shares || 0
          bValue = b.shares || 0
          break
        case 'published_at':
          aValue = new Date(a.published_at).getTime()
          bValue = new Date(b.published_at).getTime()
          break
        default:
          return 0
      }
      
      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  // Format date for display
  const formatDate = (dateStr: string, timePeriod: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatDate(label, selectedTimePeriod)}
          </p>
          <p className="text-sm text-blue-600">
            Views: {payload[0].value.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click to view top video
          </p>
        </div>
      )
    }
    return null
  }

  // Handle chart point click to open top video for that day
  const handleChartClick = async (data: any) => {
    console.log('Chart clicked:', data)
    
    if (!data || !data.date) {
      console.log('No date found in clicked data')
      return
    }

    const clickedDate = data.date
    console.log('Clicked date:', clickedDate)
    console.log('Date type:', typeof clickedDate)

    try {
      // Fetch the top video for the clicked date
      const response = await fetch(`/api/dashboard/top-video?date=${clickedDate}`)
      const result = await response.json()
      
      console.log('API response:', result)
      console.log('API URL:', `/api/dashboard/top-video?date=${clickedDate}`)
      
      if (result.success && result.video && result.video.post_url) {
        // Open the video in a new tab
        window.open(result.video.post_url, '_blank')
      } else {
        alert(`No video found for this date: ${clickedDate}`)
      }
    } catch (error) {
      console.error('Error fetching top video:', error)
      alert('Error loading video')
    }
  }

  // Custom line chart component
  const CustomLineChart = ({ data, onPointClick, selectedTimePeriod }: any) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          No data available
        </div>
      )
    }

    const width = 800
    const height = 200
    const margin = { top: 20, right: 30, left: 40, bottom: 40 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    // Calculate scales
    const maxViews = Math.max(...data.map((d: any) => d.views || 0))
    const minViews = Math.min(...data.map((d: any) => d.views || 0))
    const viewRange = maxViews - minViews || 1

    const xScale = (index: number) => (index / (data.length - 1)) * chartWidth
    const yScale = (value: number) => chartHeight - ((value - minViews) / viewRange) * chartHeight

    // Generate path for the line
    const pathData = data.map((d: any, index: number) => {
      const x = xScale(index)
      const y = yScale(d.views || 0)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')

    return (
      <div className="w-full h-full">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* Grid lines */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={i}
                x1={0}
                y1={ratio * chartHeight}
                x2={chartWidth}
                y2={ratio * chartHeight}
                stroke="#f3f4f6"
                strokeDasharray="3 3"
              />
            ))}
            
            {/* Vertical grid lines */}
            {data.map((_: any, index: number) => (
              <line
                key={index}
                x1={xScale(index)}
                y1={0}
                x2={xScale(index)}
                y2={chartHeight}
                stroke="#f3f4f6"
                strokeDasharray="3 3"
              />
            ))}

            {/* Line path */}
            <path
              d={pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
            />

            {/* Data points */}
            {data.map((d: any, index: number) => (
              <circle
                key={index}
                cx={xScale(index)}
                cy={yScale(d.views || 0)}
                r={4}
                fill="#3b82f6"
                stroke="#3b82f6"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => onPointClick(d)}
                className="hover:r-6 transition-all"
              />
            ))}

            {/* X-axis labels - only show every few dates to avoid crowding */}
            {data.map((d: any, index: number) => {
              // Show every date for 7 days, every 3rd date for 30 days, every 5th date for all time
              const showLabel = selectedTimePeriod === 'last7Days' || 
                (selectedTimePeriod === 'last30Days' && index % 3 === 0) ||
                (selectedTimePeriod === 'allTime' && index % 5 === 0);
              
              if (!showLabel) return null;
              
              return (
                <text
                  key={index}
                  x={xScale(index)}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {formatDate(d.date, selectedTimePeriod)}
                </text>
              );
            })}

            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const value = minViews + (ratio * viewRange)
              
              // Format number with K/M suffixes
              const formatNumber = (num: number) => {
                if (num >= 1000000) {
                  return (num / 1000000).toFixed(1).replace('.0', '') + 'M'
                } else if (num >= 1000) {
                  return (num / 1000).toFixed(1).replace('.0', '') + 'K'
                } else {
                  return Math.round(num).toString()
                }
              }
              
              return (
                <text
                  key={i}
                  x={-10}
                  y={yScale(value) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {formatNumber(value)}
                </text>
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.firstName}! Here&apos;s your UGC tracking overview.
            </p>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Posts"
            value={loading ? "..." : dashboardData?.totalPosts.toLocaleString() || "0"}
            change=""
            changeType="neutral"
            icon={FileText}
            description="TikTok posts tracked"
          />
          <KPICard
            title="Active Creators"
            value={loading ? "..." : dashboardData?.totalCreators.toString() || "0"}
            change=""
            changeType="neutral"
            icon={Users}
            description="TikTok creators"
          />
          <KPICard
            title="Total Views"
            value={loading ? "..." : dashboardData?.totalViews.toLocaleString() || "0"}
            change=""
            changeType="neutral"
            icon={Eye}
            description="Across all posts"
          />
          <KPICard
            title="Total Likes"
            value={loading ? "..." : dashboardData?.totalLikes.toLocaleString() || "0"}
            change=""
            changeType="neutral"
            icon={Heart}
            description="Across all posts"
          />
        </div>

        {/* Content Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Content Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading chart data...</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Total Views</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedTimePeriod('last7Days')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedTimePeriod === 'last7Days'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        7 Days
                      </button>
                      <button
                        onClick={() => setSelectedTimePeriod('last30Days')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedTimePeriod === 'last30Days'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        30 Days
                      </button>
                      <button
                        onClick={() => setSelectedTimePeriod('allTime')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          selectedTimePeriod === 'allTime'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        All Time
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedTimePeriod === 'last7Days' && 'Daily view counts across all creators (Last 7 Days)'}
                    {selectedTimePeriod === 'last30Days' && 'Daily view counts across all creators (Last 30 Days)'}
                    {selectedTimePeriod === 'allTime' && 'Daily view counts across all creators (All Time - Last 30 Days Shown)'}
                  </p>
                </div>
                    <div className="h-64 w-full">
                      <CustomLineChart 
                        data={dashboardData?.dailyViews?.[selectedTimePeriod] || []}
                        onPointClick={handleChartClick}
                        selectedTimePeriod={selectedTimePeriod}
                      />
                    </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Posts in Last 7 Days */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Posts</CardTitle>
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading top posts...</div>
            ) : dashboardData?.topPosts.length ? (
              <>
                {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {getSortedPosts().slice(0, visiblePosts).map((post, index) => (
                      <div key={post.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        {/* Thumbnail */}
                        <div className="relative aspect-[9/16] bg-gray-100">
                          {post.thumbnail_url ? (
                            <img
                              src={post.thumbnail_url}
                              alt="TikTok thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Eye className="h-8 w-8" />
                            </div>
                          )}
                          {/* Overlay with caption */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <p className="text-white text-sm line-clamp-3 leading-tight">
                              {post.caption}
                            </p>
                          </div>
                        </div>
                        
                        {/* Card content */}
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                                #{index + 1}
                              </span>
                              <span className="text-sm font-medium">@{post.username}</span>
                            </div>
                            <button
                              onClick={() => window.open(post.post_url, '_blank')}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-600 hover:text-gray-900" />
                            </button>
                          </div>
                          
                          <div className="text-lg font-semibold text-gray-900">
                            {(post.views || 0).toLocaleString()} Views
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Creator</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-900">Title</th>
                              <th className="text-center py-3 px-4 font-medium text-gray-900">
                                <button
                                  onClick={() => handleSort('published_at')}
                                  className="flex items-center justify-center gap-1 hover:text-gray-700 transition-colors"
                                >
                                  Posted
                                  <div className="w-4 h-4 text-gray-400">
                                    {sortField === 'published_at' ? (
                                      sortDirection === 'desc' ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 14l5-5 5 5z"/>
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 10l5 5 5-5z"/>
                                        </svg>
                                      )
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 10l5 5 5-5z"/>
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              </th>
                              <th className="text-right py-3 px-4 font-medium text-gray-900">
                                <button
                                  onClick={() => handleSort('views')}
                                  className="flex items-center justify-end gap-1 hover:text-gray-700 transition-colors"
                                >
                                  Views
                                  <div className="w-4 h-4 text-gray-400">
                                    {sortField === 'views' ? (
                                      sortDirection === 'desc' ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 14l5-5 5 5z"/>
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 10l5 5 5-5z"/>
                                        </svg>
                                      )
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 10l5 5 5-5z"/>
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              </th>
                              <th className="text-right py-3 px-4 font-medium text-gray-900">
                                <button
                                  onClick={() => handleSort('likes')}
                                  className="flex items-center justify-end gap-1 hover:text-gray-700 transition-colors"
                                >
                                  Likes
                                  <div className="w-4 h-4 text-gray-400">
                                    {sortField === 'likes' ? (
                                      sortDirection === 'desc' ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 14l5-5 5 5z"/>
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M7 10l5 5 5-5z"/>
                                        </svg>
                                      )
                                    ) : (
                                      <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7 10l5 5 5-5z"/>
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              </th>
                              <th className="text-center py-3 px-4 font-medium text-gray-900">Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getSortedPosts().slice(0, visiblePosts).map((post, index) => (
                              <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <span className="font-medium text-gray-900">@{post.username}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                                    {post.caption}
                                  </p>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-sm text-gray-600">
                                    {new Date(post.published_at).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-sm font-medium text-gray-900">
                                    {(post.views || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-sm font-medium text-gray-900">
                                    {(post.likes || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    onClick={() => window.open(post.post_url, '_blank')}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink className="h-4 w-4 text-gray-600 hover:text-gray-900" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                
                {visiblePosts < getSortedPosts().length && (
                  <div className="text-center pt-4">
                    <button
                      onClick={handleShowMore}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Show More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No posts found in the last 7 days
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  )
}

