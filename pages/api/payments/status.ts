import { NextApiRequest, NextApiResponse } from 'next';
const db = require('../../../src/lib/db');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get creator payment data
    const creators = db.prepare(`
      SELECT 
        c.id as creator_id,
        c.username,
        c.display_name,
        MIN(p.published_at) as first_post_date,
        COUNT(p.id) as total_posts
      FROM creators c
      LEFT JOIN posts p ON c.id = p.creator_id
      WHERE c.platform = 'tiktok' AND c.is_active = 1
      GROUP BY c.id, c.username, c.display_name
      ORDER BY c.username
    `).all();

    const paymentData = creators.map((creator: any) => {
      const firstPostDate = new Date(creator.first_post_date);
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - firstPostDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const totalPosts = creator.total_posts || 0;
      const postsNeeded = Math.max(0, 60 - totalPosts);
      const isReadyForPayment = totalPosts >= 60;
      
      // Calculate posts per day (average since they started)
      const postsPerDay = daysSinceStart > 0 ? totalPosts / daysSinceStart : 0;
      
      // Calculate posts missed (assuming 2 posts per day target)
      const expectedPosts = daysSinceStart * 2;
      const postsMissed = Math.max(0, expectedPosts - totalPosts);
      
      // Estimate when they'll reach 60 posts
      let estimatedPaymentDate = null;
      let daysUntilPayment = 0;
      
      if (!isReadyForPayment && postsPerDay > 0) {
        daysUntilPayment = Math.ceil(postsNeeded / postsPerDay);
        const estimatedDate = new Date(now);
        estimatedDate.setDate(estimatedDate.getDate() + daysUntilPayment);
        estimatedPaymentDate = estimatedDate.toISOString();
      }

      return {
        creator_id: creator.creator_id,
        username: creator.username,
        display_name: creator.display_name,
        first_post_date: creator.first_post_date,
        total_posts: totalPosts,
        posts_needed: postsNeeded,
        days_since_start: daysSinceStart,
        estimated_payment_date: estimatedPaymentDate,
        posts_per_day: postsPerDay,
        is_ready_for_payment: isReadyForPayment,
        days_until_payment: daysUntilPayment,
        posts_missed: postsMissed
      };
    });

    res.status(200).json({
      success: true,
      data: paymentData
    });

  } catch (error) {
    console.error('Error fetching payment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment data'
    });
  }
}
