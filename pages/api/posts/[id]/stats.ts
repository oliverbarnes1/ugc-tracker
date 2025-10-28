import { NextApiRequest, NextApiResponse } from 'next';
const db = require('../../../../src/lib/db/build-safe');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const { views, likes, comments, shares } = req.body;

      // Validate input
      if (typeof views !== 'number' || typeof likes !== 'number' || 
          typeof comments !== 'number' || typeof shares !== 'number') {
        return res.status(400).json({ error: 'Invalid input: all values must be numbers' });
      }

      if (views < 0 || likes < 0 || comments < 0 || shares < 0) {
        return res.status(400).json({ error: 'Invalid input: values cannot be negative' });
      }

      // Get current stats for undo functionality
      const currentStats = db.prepare(`
        SELECT views, likes, comments, shares 
        FROM post_stats 
        WHERE post_id = ?
      `).get(id);

      if (!currentStats) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Store original stats in a separate table for undo functionality
      const hasOriginalStats = db.prepare(`
        SELECT id FROM post_stats_original WHERE post_id = ?
      `).get(id);

      if (!hasOriginalStats) {
        // Store original stats if not already stored
        db.prepare(`
          INSERT INTO post_stats_original (post_id, views, likes, comments, shares, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(id, currentStats.views, currentStats.likes, currentStats.comments, currentStats.shares);
      }

      // Update the stats
      const result = db.prepare(`
        UPDATE post_stats 
        SET views = ?, likes = ?, comments = ?, shares = ?, engagement_rate = ?
        WHERE post_id = ?
      `).run(
        views, 
        likes, 
        comments, 
        shares,
        views > 0 ? (likes + comments + shares) / views : 0, // Recalculate engagement rate
        id
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Return success with original values for undo
      res.status(200).json({
        success: true,
        message: 'Stats updated successfully',
        originalStats: currentStats,
        newStats: { views, likes, comments, shares }
      });

    } catch (error) {
      console.error('Error updating post stats:', error);
      res.status(500).json({ error: 'Failed to update post stats' });
    }
  } else if (req.method === 'POST' && req.body.action === 'undo') {
    try {
      // Get original stats
      const originalStats = db.prepare(`
        SELECT views, likes, comments, shares 
        FROM post_stats_original 
        WHERE post_id = ?
      `).get(id);

      if (!originalStats) {
        return res.status(404).json({ error: 'No original stats found to undo to' });
      }

      // Restore original stats
      const result = db.prepare(`
        UPDATE post_stats 
        SET views = ?, likes = ?, comments = ?, shares = ?, engagement_rate = ?
        WHERE post_id = ?
      `).run(
        originalStats.views,
        originalStats.likes,
        originalStats.comments,
        originalStats.shares,
        originalStats.views > 0 ? (originalStats.likes + originalStats.comments + originalStats.shares) / originalStats.views : 0,
        id
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Stats restored to original values',
        restoredStats: originalStats
      });

    } catch (error) {
      console.error('Error undoing post stats:', error);
      res.status(500).json({ error: 'Failed to undo post stats' });
    }
  } else if (req.method === 'GET') {
    try {
      // Get current stats
      const stats = db.prepare(`
        SELECT views, likes, comments, shares, engagement_rate
        FROM post_stats 
        WHERE post_id = ?
      `).get(id);

      if (!stats) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if original stats exist for undo functionality
      const hasOriginalStats = db.prepare(`
        SELECT views, likes, comments, shares 
        FROM post_stats_original 
        WHERE post_id = ?
      `).get(id);

      res.status(200).json({
        success: true,
        stats,
        hasOriginalStats: !!hasOriginalStats,
        originalStats: hasOriginalStats
      });

    } catch (error) {
      console.error('Error fetching post stats:', error);
      res.status(500).json({ error: 'Failed to fetch post stats' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
