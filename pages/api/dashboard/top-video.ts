import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../src/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ success: false, message: 'Date parameter is required' });
  }

  try {
    // Normalize date format (handle YYYY-MM-DD format)
    const dateStr = date.split('T')[0]; // Extract just the date part if ISO string provided

    // Get the top video for the specified date (highest views) using latest post_stats
    const topVideo = await db.get(`
      WITH latest_ps AS (
        SELECT
          post_id,
          views,
          likes,
          comments,
          shares
        FROM post_stats
        WHERE (post_id, id) IN (
          SELECT post_id, MAX(id)
          FROM post_stats
          GROUP BY post_id
        )
      )
      SELECT 
        p.id,
        p.caption,
        p.post_url,
        p.published_at,
        c.username,
        c.display_name,
        lps.views,
        lps.likes,
        lps.comments,
        lps.shares
      FROM posts p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN latest_ps lps ON p.id = lps.post_id
      WHERE p.platform = 'tiktok'
        AND DATE(p.published_at) = ?
        AND lps.views IS NOT NULL
      ORDER BY lps.views DESC
      LIMIT 1
    `, [dateStr]);

    if (!topVideo) {
      return res.status(404).json({ 
        success: false, 
        message: 'No video found for this date' 
      });
    }

    return res.status(200).json({
      success: true,
      video: {
        id: topVideo.id,
        caption: topVideo.caption,
        post_url: topVideo.post_url,
        published_at: topVideo.published_at,
        username: topVideo.username,
        display_name: topVideo.display_name,
        views: topVideo.views,
        likes: topVideo.likes,
        comments: topVideo.comments,
        shares: topVideo.shares
      }
    });

  } catch (error) {
    console.error('Error fetching top video:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
