import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../src/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total posts count
    const totalPosts = await db.get(`
      SELECT COUNT(*) as count FROM posts WHERE platform = 'tiktok'
    `) as { count: number };

    // Get total creators count
    const totalCreators = await db.get(`
      SELECT COUNT(*) as count FROM creators WHERE platform = 'tiktok' AND is_active = 1
    `) as { count: number };

    // Get total views across all posts
    const totalViewsRow = await db.get(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT COALESCE(SUM(lps.views), 0) as total_views
      FROM posts p
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
    `) as { total_views: number } | undefined;

    // Get total likes across all posts
    const totalLikesRow = await db.get(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT COALESCE(SUM(lps.likes), 0) as total_likes
      FROM posts p
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
    `) as { total_likes: number } | undefined;

    // Use latest post_stats per post to avoid duplicates (multiple snapshots)
    // Top posts from last 7 days ordered by latest views
    const topPosts = await db.all(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT 
        p.id,
        p.caption,
        p.post_url,
        p.thumbnail_url,
        p.published_at,
        c.username,
        c.display_name,
        lps.views,
        lps.likes,
        lps.comments,
        lps.shares,
        lps.saves
      FROM posts p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
        AND (
          p.created_at >= datetime('now', '-7 days')
          OR 1=1
        )
      ORDER BY lps.views DESC
    `);

    // Get creator performance with 7-day posting activity
    const creatorStatsRaw = await db.all(`
      SELECT 
        c.id,
        c.username,
        c.display_name,
        COUNT(p.id) as post_count,
        COALESCE(SUM(lps.views), 0) as total_views,
        COALESCE(SUM(lps.likes), 0) as total_likes,
        COALESCE(AVG(lps.views), 0) as avg_views
      FROM creators c
      LEFT JOIN posts p ON c.id = p.creator_id AND p.platform = 'tiktok'
      LEFT JOIN (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      ) lps ON p.id = lps.post_id
      WHERE c.platform = 'tiktok' AND c.is_active = 1
      GROUP BY c.id, c.username, c.display_name
      ORDER BY total_views DESC
    `);

    // Process each creator to add 7-day activity data
    const creatorStatsWithActivity = await Promise.all(creatorStatsRaw.map(async (creator: any) => {
      const dailyActivity: { [key: string]: number } = {};
      
      // Initialize all 7 days to 0 posts
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i)); // Go back 6 days from today for the first day, up to today for the last
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dailyActivity[dayKey] = 0;
      }

      // Fetch actual post counts for the last 7 days for this creator
      const postsPerDay = await db.all(`
        SELECT DATE(published_at) as post_date, COUNT(*) as count
        FROM posts
        WHERE creator_id = ?
          AND platform = 'tiktok'
          AND published_at >= datetime('now', '-7 days')
        GROUP BY post_date
      `, [creator.id]);

      postsPerDay.forEach((day: any) => {
        dailyActivity[day.post_date] = day.count;
      });

      // Get total views for the last 7 days
      const last7DaysViews = await db.get(`
        WITH latest_ps AS (
          SELECT ps.* FROM post_stats ps
          JOIN (
            SELECT post_id, MAX(id) AS max_id
            FROM post_stats
            GROUP BY post_id
          ) t ON ps.id = t.max_id
        )
        SELECT COALESCE(SUM(lps.views), 0) as total_views_7_days
        FROM posts p
        LEFT JOIN latest_ps lps ON p.id = lps.post_id
        WHERE p.creator_id = ?
          AND p.platform = 'tiktok'
          AND p.published_at >= datetime('now', '-7 days')
      `, [creator.id]);

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
    }));

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
    const dailyViews7DaysRaw = await db.all(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(lps.views), 0) as views
      FROM posts p
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
        AND p.published_at >= datetime('now', '-7 days')
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `);

    const dailyViews30DaysRaw = await db.all(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(lps.views), 0) as views
      FROM posts p
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
        AND p.published_at >= datetime('now', '-30 days')
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `);

    const dailyViewsAllTimeRaw = await db.all(`
      WITH latest_ps AS (
        SELECT ps.* FROM post_stats ps
        JOIN (
          SELECT post_id, MAX(id) AS max_id
          FROM post_stats
          GROUP BY post_id
        ) t ON ps.id = t.max_id
      )
      SELECT 
        DATE(p.published_at) as date,
        COALESCE(SUM(lps.views), 0) as views
      FROM posts p
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
      GROUP BY DATE(p.published_at)
      ORDER BY date
    `);

    // Fill missing days with 0 views
    const dailyViews7Days = fillMissingDays(dailyViews7DaysRaw, 7)
    const dailyViews30Days = fillMissingDays(dailyViews30DaysRaw, 30)
    const dailyViewsAllTime = fillMissingDays(dailyViewsAllTimeRaw, 30) // Show last 30 days for all time

    return res.status(200).json({
      success: true,
      data: {
        totalPosts: totalPosts.count,
        totalCreators: totalCreators.count,
        totalViews: (totalViewsRow?.total_views ?? 0),
        totalLikes: (totalLikesRow?.total_likes ?? 0),
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
