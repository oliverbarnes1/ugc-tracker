import { Layout } from '@/components/layout/layout'
import { Users } from 'lucide-react'
import { useState, useEffect } from 'react'

interface CreatorStats {
  username: string
  display_name: string
  post_count: number
  total_views: number
  total_likes: number
  avg_views: number
  activity: { date: string; count: number }[]
  total_views_7_days: number
}

export default function CreatorsPage() {
  // Mock user for development
  const user = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: ''
  }
  const [creatorStats, setCreatorStats] = useState<CreatorStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCreatorStats = async () => {
      try {
        // Use demo API for production deployment
        const apiEndpoint = process.env.NODE_ENV === 'production' 
          ? '/api/dashboard/stats-demo' 
          : '/api/dashboard/stats'
        
        const response = await fetch(apiEndpoint)
        const result = await response.json()
        if (result.success) {
          setCreatorStats(result.data.creatorStats)
        }
      } catch (error) {
        console.error('Error fetching creator stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreatorStats()
  }, [])


  // Generate 7-day activity data with day labels
  const generateActivityData = (activity: { date: string; count: number }[]) => {
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const today = new Date()
    const activityMap = new Map<string, number>()
    activity.forEach(item => activityMap.set(item.date, item.count))

    const last7DaysActivity = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateKey = d.toISOString().split('T')[0]
      const dayIndex = d.getDay()
      const dayLabel = daysOfWeek[dayIndex]
      const count = activityMap.get(dateKey) || 0
      last7DaysActivity.push({ dayLabel, count })
    }
    return last7DaysActivity
  }

  // Get activity level color based on post count (matching the provided image)
  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-white text-gray-500 border border-gray-200' // White background, gray text, light border
    if (count === 1) return 'bg-gray-300 text-gray-800' // Medium gray, dark text
    if (count >= 2) return 'bg-gray-800 text-white' // Dark gray/black, white text (target met)
    return 'bg-white text-gray-500 border border-gray-200' // Default for safety
  }


  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creators</h1>
          <p className="text-muted-foreground">
            Manage TikTok creators and view their performance metrics.
          </p>
        </div>


        {/* Creator Performance */}
        <div>
          {loading ? (
            <div className="text-center py-8">Loading creator stats...</div>
          ) : creatorStats.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatorStats.map((creator) => {
                const activityData = generateActivityData(creator.activity)
                const totalWeekPosts = activityData.reduce((sum, day) => sum + day.count, 0)
                const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                
                return (
                  <div key={creator.username} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    {/* Header with username and platform badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <a 
                            href={`https://www.tiktok.com/@${creator.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            @{creator.username}
                          </a>
                          <p className="text-sm text-gray-600">{creator.display_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">{totalWeekPosts}/14 posts</div>
                        <div className="text-sm text-gray-500">14 posts/week target</div>
                      </div>
                    </div>
                    
                    {/* 7-Day Activity Chart */}
                    <div className="mb-4">
                      <div className="flex justify-center gap-2 mb-2">
                        {activityData.map((day, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-medium ${getActivityColor(day.count)}`}
                              title={`${day.dayLabel}: ${day.count} posts`}
                            >
                              {day.count}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{day.dayLabel}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance metrics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Views:</span>
                        <div className="font-medium text-gray-900">{(creator.total_views || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">7-Day Views:</span>
                        <div className="font-medium text-gray-900">{(creator.total_views_7_days || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Likes:</span>
                        <div className="font-medium text-gray-900">{(creator.total_likes || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No creator stats found
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

