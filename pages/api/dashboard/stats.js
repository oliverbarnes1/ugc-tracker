const db = require('../../../src/lib/db')

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get workspace stats
    const workspaceStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_creators,
        COUNT(DISTINCT p.id) as total_posts,
        SUM(ps.likes) as total_likes,
        SUM(ps.comments) as total_comments,
        SUM(ps.shares) as total_shares,
        SUM(ps.views) as total_views
      FROM workspaces w
      LEFT JOIN creators c ON w.id = c.workspace_id
      LEFT JOIN posts p ON c.id = p.creator_id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE w.id = 1
    `).get()

    // Get recent posts
    const recentPosts = db.prepare(`
      SELECT 
        p.id,
        p.caption,
        p.media_url,
        p.published_at,
        c.username,
        c.display_name,
        c.avatar_url,
        ps.likes,
        ps.comments,
        ps.shares,
        ps.views
      FROM posts p
      JOIN creators c ON p.creator_id = c.id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE c.workspace_id = 1
      ORDER BY p.published_at DESC
      LIMIT 5
    `).all()

    // Get top creators by engagement
    const topCreators = db.prepare(`
      SELECT 
        c.id,
        c.username,
        c.display_name,
        c.avatar_url,
        c.follower_count,
        COUNT(p.id) as posts_count,
        SUM(ps.likes + ps.comments + ps.shares) as total_engagement,
        AVG(ps.engagement_rate) as avg_engagement_rate
      FROM creators c
      LEFT JOIN posts p ON c.id = p.creator_id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE c.workspace_id = 1
      GROUP BY c.id
      ORDER BY total_engagement DESC
      LIMIT 3
    `).all()

    return res.status(200).json({
      success: true,
      data: {
        stats: workspaceStats,
        recentPosts,
        topCreators
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
