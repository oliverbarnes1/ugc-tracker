import { NextApiRequest, NextApiResponse } from 'next'
const db = require('../../../src/lib/db')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { date } = req.query

  if (!date || typeof date !== 'string') {
    return res.status(400).json({ success: false, message: 'Date parameter is required' })
  }

  try {

    // Get the top video for the specified date (highest views)
    const topVideo = db.prepare(`
      SELECT 
        p.id,
        p.caption,
        p.post_url,
        p.published_at,
        c.username,
        c.display_name,
        ps.views,
        ps.likes,
        ps.comments,
        ps.shares
      FROM posts p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE p.platform = 'tiktok'
        AND DATE(p.published_at) = ?
        AND ps.views IS NOT NULL
      ORDER BY ps.views DESC
      LIMIT 1
    `).get(date)

    if (!topVideo) {
      return res.status(404).json({ 
        success: false, 
        message: 'No video found for this date' 
      })
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
    })

  } catch (error) {
    console.error('Error fetching top video:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
