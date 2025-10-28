import { NextApiRequest, NextApiResponse } from 'next';
const db = require('../../../src/lib/db/build-safe');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total posts count
    const totalPosts = db.prepare(`
      SELECT COUNT(*) as count FROM posts WHERE platform = 'tiktok'
    `).get() as { count: number };

    // Get total creators count
    const totalCreators = db.prepare(`
      SELECT COUNT(*) as count FROM creators WHERE platform = 'tiktok' AND is_active = 1
    `).get() as { count: number };

    // Get total views across all posts
    const totalViews = db.prepare(`
      SELECT COALESCE(SUM(ps.views), 0) as total_views
      FROM posts p
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
    `).get() as { total_views: number };

    // Get total likes across all posts
    const totalLikes = db.prepare(`
      SELECT COALESCE(SUM(ps.likes), 0) as total_likes
      FROM posts p
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
    `).get() as { total_likes: number };

    // Get top posts from last 7 days ordered by views
    const topPosts = db.prepare(`
      SELECT 
        p.id,
        p.caption,
        p.post_url,
        p.thumbnail_url,
        p.published_at,
        c.username,
        c.display_name,
        ps.views,
        ps.likes,
        ps.comments,
        ps.shares,
        ps.saves
      FROM posts p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
        AND p.created_at >= datetime('now', '-7 days')
      ORDER BY ps.views DESC
    `).all();

    // Get creator performance with 7-day posting activity
    const creatorStatsRaw = db.prepare(`
      SELECT 
        c.id,
        c.username,
        c.display_name,
        COUNT(p.id) as post_count,
        COALESCE(SUM(ps.views), 0) as total_views,
        COALESCE(SUM(ps.likes), 0) as total_likes,
        COALESCE(AVG(ps.views), 0) as avg_views
      FROM creators c
      LEFT JOIN posts p ON c.id = p.creator_id AND p.platform = 'tiktok'
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE c.platform = 'tiktok' AND c.is_active = 1
      GROUP BY c.id, c.username, c.display_name
      ORDER BY total_views DESC
    `).all();

    // Process each creator to add 7-day activity data
    const creatorStatsWithActivity = creatorStatsRaw.map((creator: any) => {
      const dailyActivity: { [key: string]: number } = {};
      
      // Initialize all 7 days to 0 posts
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i)); // Go back 6 days from today for the first day, up to today for the last
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyActivity[dayKey] = 0;
      }

      // Fetch actual post counts for the last 7 days for this creator
      const postsPerDay = db.prepare(`
        SELECT DATE(published_at) as post_date, COUNT(*) as count
        FROM posts
        WHERE creator_id = ?
          AND platform = 'tiktok'
          AND published_at >= datetime('now', '-7 days')
        GROUP BY post_date
      `).all(creator.id);

      postsPerDay.forEach((day: any) => {
        dailyActivity[day.post_date] = day.count;
      });

      // Get total views for the last 7 days
      const last7DaysViews = db.prepare(`
        SELECT COALESCE(SUM(ps.views), 0) as total_views_7_days
        FROM posts p
        LEFT JOIN post_stats ps ON p.id = ps.post_id
        WHERE p.creator_id = ?
          AND p.platform = 'tiktok'
          AND p.published_at >= datetime('now', '-7 days')
      `).get(creator.id);

      // Convert dailyActivity object to an array of { date: string, count: number } for easier frontend processing
      const activityArray = Object.keys(dailyActivity).sort().map(date => ({
        date: date,
        count: dailyActivity[date]
      }));

      return {
        ...creator,
        activity: activityArray, // This will be an array of { date: 'YYYY-MM-DD', count: N }
        total_views_7_days: last7DaysViews?.total_views_7_days || 0
      };
    });

    // Helper function to fill missing days with 0 views
    const fillMissingDays = (data: any[], days: number) => {
      const result = []
      const today = new Date()
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD format
        
        const existingData = data.find(d => d.date === dateStr)
        result.push({
          date: dateStr,
          views: existingData ? existingData.views : 0
        })
      }
      
      return result
    }

    // Get daily views data for different time periods
    const dailyViews7DaysRaw = db.prepare(`
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(ps.views), 0) as views
      FROM posts p
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
        AND p.published_at >= datetime('now', '-7 days')
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `).all();

    const dailyViews30DaysRaw = db.prepare(`
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(ps.views), 0) as views
      FROM posts p
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
        AND p.published_at >= datetime('now', '-30 days')
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `).all();

    const dailyViewsAllTimeRaw = db.prepare(`
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(ps.views), 0) as views
      FROM posts p
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `).all();

    // Fill missing days with 0 views
    const dailyViews7Days = fillMissingDays(dailyViews7DaysRaw, 7)
    const dailyViews30Days = fillMissingDays(dailyViews30DaysRaw, 30)
    const dailyViewsAllTime = fillMissingDays(dailyViewsAllTimeRaw, 30) // Show last 30 days for all time

    return res.status(200).json({
      success: true,
      data: {
        totalPosts: totalPosts.count,
        totalCreators: totalCreators.count,
        totalViews: totalViews.total_views,
        totalLikes: totalLikes.total_likes,
        topPosts,
        creatorStats: creatorStatsWithActivity,
        dailyViews: {
          last7Days: dailyViews7Days,
          last30Days: dailyViews30Days,
          allTime: dailyViewsAllTime
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
}
