import { Layout } from '@/components/layout/layout'
import { withAuth } from '@/lib/withAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardProps {
  user: {
    id: number
    email: string
    firstName: string
    lastName: string
    avatarUrl: string
  }
  loading: boolean
}

interface CreatorStats {
  username: string
  display_name: string
  post_count: number
  total_views: number
  total_likes: number
  avg_views: number
}

function UsersPage({ user }: DashboardProps) {
  const [creatorStats, setCreatorStats] = useState<CreatorStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCreatorStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage and view user accounts in your workspace.
          </p>
        </div>

        {/* Creator Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Creator Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading creator stats...</div>
            ) : creatorStats.length ? (
              <div className="space-y-4">
                {creatorStats.map((creator) => (
                  <div key={creator.username} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">@{creator.username}</h3>
                        <p className="text-sm text-muted-foreground">{creator.display_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{creator.post_count} posts</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(creator.avg_views || 0).toLocaleString()} avg views
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Views:</span>
                        <div className="font-medium">{(creator.total_views || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Likes:</span>
                        <div className="font-medium">{(creator.total_likes || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No creator stats found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default withAuth(UsersPage)
