import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    // Mock data for demo purposes
    const mockData = {
      totalPosts: 156,
      totalCreators: 10,
      totalViews: 2847392,
      totalLikes: 89234,
      topPosts: [
        {
          id: 1,
          caption: "This is how you style a simple outfit! #fashion #style #outfit",
          post_url: "https://www.tiktok.com/@_carlapicks_/video/1234567890",
          thumbnail_url: "https://p16-sign-va.tiktokcdn-us.com/obj/tos-useast2a-p-0037-aiso/1234567890.jpeg",
          published_at: "2024-10-25T10:30:00Z",
          username: "_carlapicks_",
          display_name: "Carla Picks",
          views: 2847392,
          likes: 89234,
          comments: 1234,
          shares: 567,
          saves: 0
        },
        {
          id: 2,
          caption: "5 styling tips that changed my life ✨ #fashion #tips #style",
          post_url: "https://www.tiktok.com/@_carlapicks_/video/1234567891",
          thumbnail_url: "https://p16-sign-va.tiktokcdn-us.com/obj/tos-useast2a-p-0037-aiso/1234567891.jpeg",
          published_at: "2024-10-24T15:45:00Z",
          username: "_carlapicks_",
          display_name: "Carla Picks",
          views: 1923847,
          likes: 67342,
          comments: 987,
          shares: 432,
          saves: 0
        },
        {
          id: 3,
          caption: "Outfit of the day! What do you think? #ootd #fashion",
          post_url: "https://www.tiktok.com/@klara.picks/video/1234567892",
          thumbnail_url: "https://p16-sign-va.tiktokcdn-us.com/obj/tos-useast2a-p-0037-aiso/1234567892.jpeg",
          published_at: "2024-10-23T09:15:00Z",
          username: "klara.picks",
          display_name: "Klara Picks",
          views: 1456789,
          likes: 45678,
          comments: 654,
          shares: 321,
          saves: 0
        },
        {
          id: 4,
          caption: "How to mix patterns like a pro 🎨 #fashion #styling",
          post_url: "https://www.tiktok.com/@_carlapicks_/video/1234567893",
          thumbnail_url: "https://p16-sign-va.tiktokcdn-us.com/obj/tos-useast2a-p-0037-aiso/1234567893.jpeg",
          published_at: "2024-10-22T14:20:00Z",
          username: "_carlapicks_",
          display_name: "Carla Picks",
          views: 987654,
          likes: 32145,
          comments: 543,
          shares: 234,
          saves: 0
        },
        {
          id: 5,
          caption: "Casual Friday vibes 💼 #workwear #fashion",
          post_url: "https://www.tiktok.com/@klara.picks/video/1234567894",
          thumbnail_url: "https://p16-sign-va.tiktokcdn-us.com/obj/tos-useast2a-p-0037-aiso/1234567894.jpeg",
          published_at: "2024-10-21T11:30:00Z",
          username: "klara.picks",
          display_name: "Klara Picks",
          views: 765432,
          likes: 23456,
          comments: 432,
          shares: 189,
          saves: 0
        }
      ],
      creatorStats: [
        {
          username: "_carlapicks_",
          display_name: "Carla Picks",
          post_count: 45,
          total_views: 2847392,
          total_likes: 89234,
          avg_views: 63275,
          activity: [
            { date: "2024-10-19", count: 2 },
            { date: "2024-10-20", count: 1 },
            { date: "2024-10-21", count: 3 },
            { date: "2024-10-22", count: 2 },
            { date: "2024-10-23", count: 1 },
            { date: "2024-10-24", count: 2 },
            { date: "2024-10-25", count: 1 }
          ],
          total_views_7_days: 2847392
        },
        {
          username: "klara.picks",
          display_name: "Klara Picks",
          post_count: 38,
          total_views: 1456789,
          total_likes: 45678,
          avg_views: 38336,
          activity: [
            { date: "2024-10-19", count: 1 },
            { date: "2024-10-20", count: 2 },
            { date: "2024-10-21", count: 1 },
            { date: "2024-10-22", count: 1 },
            { date: "2024-10-23", count: 2 },
            { date: "2024-10-24", count: 1 },
            { date: "2024-10-25", count: 0 }
          ],
          total_views_7_days: 1456789
        }
      ],
      dailyViews: {
        last7Days: [
          { date: "2024-10-19", views: 234567 },
          { date: "2024-10-20", views: 345678 },
          { date: "2024-10-21", views: 456789 },
          { date: "2024-10-22", views: 567890 },
          { date: "2024-10-23", views: 678901 },
          { date: "2024-10-24", views: 789012 },
          { date: "2024-10-25", views: 890123 }
        ],
        last30Days: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 500000) + 100000
        })),
        allTime: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 800000) + 200000
        }))
      }
    }

    return res.status(200).json({
      success: true,
      data: mockData
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
