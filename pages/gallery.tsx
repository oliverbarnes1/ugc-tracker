import { Layout } from '@/components/layout/layout'
import { Image, Calendar, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface GalleryPost {
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
  saves: number
}

export default function GalleryPage() {
  // Mock user for development
  const user = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    avatarUrl: ''
  }
  const [galleryPosts, setGalleryPosts] = useState<GalleryPost[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<GalleryPost | null>(null)
  const [sortBy, setSortBy] = useState<'views' | 'newest' | 'oldest' | 'likes' | 'comments'>('views')
  const [selectedCreator, setSelectedCreator] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [creators, setCreators] = useState<string[]>([])

  useEffect(() => {
    const fetchGalleryPosts = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        const result = await response.json()
        if (result.success) {
          setGalleryPosts(result.data.topPosts)
          // Extract unique creators
          const uniqueCreators = [...new Set(result.data.topPosts.map((post: GalleryPost) => post.username))]
          setCreators(uniqueCreators)
        }
      } catch (error) {
        console.error('Error fetching gallery posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGalleryPosts()
  }, [])

  // Filter and sort posts
  const getFilteredAndSortedPosts = () => {
    let filtered = [...galleryPosts]

    // Filter by creator
    if (selectedCreator !== 'all') {
      filtered = filtered.filter(post => post.username === selectedCreator)
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      filtered = filtered.filter(post => new Date(post.published_at) >= fromDate)
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(post => new Date(post.published_at) <= toDate)
    }

    // Sort posts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return (b.views || 0) - (a.views || 0)
        case 'likes':
          return (b.likes || 0) - (a.likes || 0)
        case 'comments':
          return (b.comments || 0) - (a.comments || 0)
        case 'newest':
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        case 'oldest':
          return new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
          <p className="text-muted-foreground">
            Visual collection of all TikTok posts from your creators.
          </p>
        </div>

        {/* Filters and Sorting */}
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Filters */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">From:</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  {dateFrom && (
                    <button
                      onClick={() => setDateFrom('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">To:</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  />
                  {dateTo && (
                    <button
                      onClick={() => setDateTo('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="views">Most Views</option>
                  <option value="likes">Most Likes</option>
                  <option value="comments">Most Comments</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Post Count */}
            <div className="ml-auto text-sm text-gray-600">
              Showing {getFilteredAndSortedPosts().length} of {galleryPosts.length} posts
            </div>
          </div>

          {/* Creator Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCreator('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCreator === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Creators
            </button>
            {creators.map((creator) => (
              <button
                key={creator}
                onClick={() => setSelectedCreator(creator)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCreator === creator
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                @{creator}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div>
          {loading ? (
            <div className="text-center py-8">Loading gallery...</div>
          ) : getFilteredAndSortedPosts().length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {getFilteredAndSortedPosts().map((post) => (
                <div 
                  key={post.id} 
                  className="group cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="relative aspect-[9/16] bg-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt="TikTok thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="h-8 w-8" />
                      </div>
                    )}
                    
                    {/* Overlay with stats */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">@{post.username}</span>
                          <span className="text-xs">{(post.views || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {galleryPosts.length === 0 
                  ? 'No posts found in gallery' 
                  : 'No posts match your current filters'
                }
              </div>
            )}
        </div>

        {/* Modal for selected post */}
        {selectedPost && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedPost(null)}
          >
            <div 
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Post Details</h2>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex">
                {/* Left Panel - Video Thumbnail */}
                <div className="w-1/2 p-6">
                  <div className="relative aspect-[9/16] bg-gray-100 rounded-xl overflow-hidden">
                    {selectedPost.thumbnail_url ? (
                      <img
                        src={selectedPost.thumbnail_url}
                        alt="TikTok thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="h-12 w-12" />
                      </div>
                    )}
                    
                    {/* Caption Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="text-white text-sm leading-relaxed">
                        {selectedPost.caption}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Panel - Post Details */}
                <div className="w-1/2 p-6">
                  <div className="space-y-4">
                    {/* Username */}
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">@{selectedPost.username}</h3>
                    </div>
                    
                    {/* Caption */}
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        {selectedPost.caption}
                      </p>
                    </div>
                    
                    {/* Date */}
                    <div>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedPost.published_at).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} • {new Date(selectedPost.published_at).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </p>
                    </div>
                    
                    {/* Statistics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Views</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(selectedPost.views || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Likes</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(selectedPost.likes || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Comments</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(selectedPost.comments || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Shares</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(selectedPost.shares || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Saves</div>
                        <div className="text-2xl font-bold text-gray-900">
                          N/A
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Engagement</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedPost.views > 0 ? 
                            (((selectedPost.likes || 0) + (selectedPost.comments || 0) + (selectedPost.shares || 0)) / selectedPost.views * 100).toFixed(1) + '%' 
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="pt-4">
                      <a
                        href={selectedPost.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium"
                      >
                        Open on TikTok
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

