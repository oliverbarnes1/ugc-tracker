import { NextApiRequest, NextApiResponse } from 'next';
const db = require('../../../src/lib/db');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get creator data with posts and views
    const creators = db.prepare(`
      SELECT 
        c.id as creator_id,
        c.username,
        c.display_name,
        COUNT(p.id) as total_posts,
        COALESCE(SUM(ps.views), 0) as total_views
      FROM creators c
      LEFT JOIN posts p ON c.id = p.creator_id
      LEFT JOIN post_stats ps ON p.id = ps.post_id
      WHERE c.platform = 'tiktok' AND c.is_active = 1
      GROUP BY c.id, c.username, c.display_name
      ORDER BY c.username
    `).all();

    const cpmData = creators.map((creator: any) => {
      const totalPosts = creator.total_posts || 0;
      const totalViews = creator.total_views || 0;
      
      // Calculate money earned so far based on posts made
      // €500 for 60 videos = €8.33 per video
      const moneyEarnedSoFar = (totalPosts / 60) * 500;
      
      // Calculate CPM (Cost Per Mille - per 1000 views)
      const cpm = totalViews > 0 ? (moneyEarnedSoFar / totalViews) * 1000 : 0;
      
      // Calculate progress metrics
      const postsNeededForPayment = Math.max(0, 60 - totalPosts);
      const potentialTotalEarnings = 500; // Full payment if they reach 60 posts

      return {
        creator_id: creator.creator_id,
        username: creator.username,
        display_name: creator.display_name,
        total_posts: totalPosts,
        total_views: totalViews,
        money_earned_so_far: moneyEarnedSoFar,
        cpm: cpm,
        posts_needed_for_payment: postsNeededForPayment,
        potential_total_earnings: potentialTotalEarnings
      };
    });

    res.status(200).json({
      success: true,
      data: cpmData
    });

  } catch (error) {
    console.error('Error calculating CPM data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate CPM data'
    });
  }
}
