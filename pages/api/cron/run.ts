import { NextApiRequest, NextApiResponse } from 'next';
import { runTikTokScraper, normalizeItemToPostAndStat, normalizeApifyItem, sleep } from '../../../src/lib/apify';
import { db } from '../../../src/lib/db';

interface Creator {
  id: number;
  external_id: string;
  platform: string;
  username: string;
  display_name: string;
  is_active: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow preflight and ensure JSON responses on all methods
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'x-cron-key, content-type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Check for cron secret
  const cronKey = req.headers['x-cron-key'];
  const expectedKey = process.env.CRON_SECRET;

  if (!cronKey || !expectedKey || cronKey !== expectedKey) {
    console.log('Unauthorized cron request - missing or invalid key');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting TikTok scraper cron job...');

    // Get all active creators
    const creators = await db.all(`
      SELECT id, external_id, platform, username, display_name, is_active
      FROM creators 
      WHERE is_active = 1 AND platform = 'tiktok'
    `) as Creator[];

    if (creators.length === 0) {
      console.log('No active TikTok creators found');
      return res.status(200).json({ 
        success: true, 
        message: 'No active TikTok creators found',
        processed: 0 
      });
    }

    console.log(`Found ${creators.length} active TikTok creators`);

    // PURGE ALL EXISTING DATA for active creators BEFORE importing new data
    // This ensures a clean slate and prevents duplicates/over-counting
    console.log('Purging existing data for all active creators...');
    const creatorIds = creators.map(c => c.id);
    if (creatorIds.length > 0) {
      const placeholders = creatorIds.map(() => '?').join(',');
      
      // Delete stats tied to posts of these creators (in correct order due to foreign keys)
      await db.run(`
        DELETE FROM post_stats 
        WHERE post_id IN (
          SELECT id FROM posts WHERE creator_id IN (${placeholders})
        )
      `, creatorIds);
      console.log(`Deleted post_stats for ${creatorIds.length} creators`);

      // Delete original stats snapshots
      await db.run(`
        DELETE FROM post_stats_original 
        WHERE post_id IN (
          SELECT id FROM posts WHERE creator_id IN (${placeholders})
        )
      `, creatorIds);
      console.log(`Deleted post_stats_original for ${creatorIds.length} creators`);

      // Delete aggregated daily stats if present
      try {
        await db.run(`
          DELETE FROM creator_stats_daily 
          WHERE creator_id IN (${placeholders})
        `, creatorIds);
        console.log(`Deleted creator_stats_daily for ${creatorIds.length} creators`);
      } catch (err) {
        // Table may not exist; ignore
        console.log('creator_stats_daily table not found or error (ignored)');
      }

      // Delete all posts for these creators
      await db.run(`
        DELETE FROM posts WHERE creator_id IN (${placeholders})
      `, creatorIds);
      console.log(`Deleted posts for ${creatorIds.length} creators`);
      
      console.log('Purge complete. Starting fresh import...');
    }

    // Batch creators into groups of 10
    const batchSize = 10;
    const batches: Creator[][] = [];
    for (let i = 0; i < creators.length; i += batchSize) {
      batches.push(creators.slice(i, i + batchSize));
    }

    console.log(`Processing ${batches.length} batches of creators`);

    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} creators`);

      // Create sync logs for this batch
      const syncLogs = await Promise.all(batch.map(async (creator) => {
        await db.run(`
          INSERT INTO sync_logs (workspace_id, platform, sync_type, status, started_at)
          VALUES (1, 'tiktok', 'posts', 'queued', CURRENT_TIMESTAMP)
        `);
        // Note: We can't get lastInsertRowid with the new async API easily
        // For now, we'll use a placeholder ID
        return { id: Date.now() + Math.random(), creator_id: creator.id };
      }));

      try {
        // Run the TikTok scraper for this batch
        const result = await runTikTokScraper(
          batch.map(creator => ({
            id: creator.id,
            handle: `@${creator.username}`, // Format as TikTok handle
            platform: creator.platform,
          })),
          process.env.APIFY_ACTOR_ID! // This now contains the task ID
        );

        if (!result.success) {
          console.error(`Batch ${batchIndex + 1} failed:`, result.error);
          
          // Update sync logs with error
          await Promise.all(syncLogs.map(async (log) => {
            await db.run(`
              UPDATE sync_logs 
              SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `, [result.error || 'Unknown error', log.id]);
          }));
          
          totalErrors += batch.length;
          continue;
        }

        console.log(`Batch ${batchIndex + 1} succeeded with ${result.items.length} items`);

        // Process each item
        let batchProcessed = 0;
        let batchErrors = 0;

        for (const item of result.items) {
          try {
            // Log the first item to see the real Apify data structure
            if (batchProcessed === 0) {
              console.log('=== FULL APIFY ITEM STRUCTURE ===');
              console.log(JSON.stringify(item, null, 2));
            }

            // Find the creator for this item
            let creator = null;
            
            // Try authorMeta.name first (TikTok format)
            if (item.authorMeta && item.authorMeta.name) {
              creator = batch.find(c => c.username === item.authorMeta.name);
              console.log(`Creator lookup by authorMeta.name: ${item.authorMeta.name} -> ${creator?.username || 'NOT FOUND'}`);
            }
            
            // Fallback to URL extraction
            if (!creator && item.webVideoUrl) {
              const urlMatch = item.webVideoUrl.match(/@([^/]+)/);
              if (urlMatch) {
                const usernameFromUrl = urlMatch[1];
                creator = batch.find(c => c.username === usernameFromUrl);
                console.log(`Creator lookup by URL: ${usernameFromUrl} -> ${creator?.username || 'NOT FOUND'}`);
              }
            }
            
            // Fallback to other matching methods
            if (!creator) {
              creator = batch.find(c => c.username === item.username || c.external_id === item.userId);
            }
            
            if (!creator) {
              console.error('Could not find creator for item:', { id: item.id, authorMeta: item.authorMeta, webVideoUrl: item.webVideoUrl });
              continue;
            }

            // Normalize the item using the new function
            const normalized = normalizeApifyItem(item, creator.id);
            if (!normalized) {
              console.error('Failed to normalize item:', { id: item.id, error: 'Normalization returned null' });
              continue;
            }

            // Debug: Log the normalized data for first item
            if (batchProcessed === 0) {
              console.log('=== NORMALIZED DATA ===');
              console.log(JSON.stringify(normalized, null, 2));
            }

            // Upsert the post
            await db.run(`
              INSERT INTO posts (creator_id, external_id, platform, content_type, caption, media_url, thumbnail_url, post_url, published_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(creator_id, external_id, platform) DO UPDATE SET
                caption = excluded.caption,
                media_url = excluded.media_url,
                thumbnail_url = excluded.thumbnail_url,
                post_url = excluded.post_url,
                published_at = excluded.published_at,
                updated_at = CURRENT_TIMESTAMP
            `, [
              normalized.post.creator_id,
              normalized.post.external_id,
              normalized.post.platform,
              normalized.post.content_type,
              normalized.post.caption,
              normalized.post.media_url,
              normalized.post.thumbnail_url,
              normalized.post.post_url,
              normalized.post.published_at
            ]);

            // Get the post ID (either from insert or existing post)
            // Since we can't get lastInsertRowid with the new async API, we'll query for the post ID
            const existingPost = await db.get(`
              SELECT id FROM posts 
              WHERE creator_id = ? AND external_id = ? AND platform = ?
            `, [
              normalized.post.creator_id,
              normalized.post.external_id,
              normalized.post.platform
            ]);
            const postId = existingPost?.id;

            if (!postId) {
              console.error('Failed to get postId after upsert:', { 
                creator_id: normalized.post.creator_id,
                external_id: normalized.post.external_id,
                platform: normalized.post.platform
              });
              continue;
            }

            // Always insert PostStat with real data (never fake values)
            console.log(`Inserting PostStat for postId: ${postId}, views: ${normalized.stat.views}, likes: ${normalized.stat.likes}`);
            
            try {
              // Insert new PostStat (always create new row, don't update existing)
              await db.run(`
                INSERT INTO post_stats (post_id, likes, comments, shares, views, saves, engagement_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                postId,
                normalized.stat.likes,
                normalized.stat.comments,
                normalized.stat.shares,
                normalized.stat.views,
                normalized.stat.saves,
                normalized.stat.engagement_rate
              ]);
              
              console.log(`PostStat inserted successfully for postId: ${postId}`);
            } catch (statError) {
              console.error('PostStat insertion error:', statError, { 
                postId, 
                stat: normalized.stat,
                error: statError instanceof Error ? statError.message : String(statError)
              });
              // Continue processing other items even if one fails
            }

            batchProcessed++;
          } catch (itemError) {
            console.error('Error processing item:', itemError, item);
            batchErrors++;
          }
        }

        // Update sync logs with success
        await Promise.all(syncLogs.map(async (log) => {
          await db.run(`
            UPDATE sync_logs 
            SET status = 'success', records_processed = ?, records_created = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [batchProcessed, batchProcessed, log.id]);
        }));

        totalProcessed += batchProcessed;
        totalErrors += batchErrors;

        console.log(`Batch ${batchIndex + 1} completed: ${batchProcessed} processed, ${batchErrors} errors`);
        
        // If no items were processed, throw an error
        if (batchProcessed === 0 && result.items.length > 0) {
          throw new Error(`Normalization failed - ${result.items.length} items received but 0 processed`);
        }

        // Sleep between batches to avoid throttling
        if (batchIndex < batches.length - 1) {
          console.log('Sleeping 5 seconds before next batch...');
          await sleep(5000);
        }

      } catch (batchError) {
        console.error(`Error processing batch ${batchIndex + 1}:`, batchError);
        
        // Update sync logs with error
        await Promise.all(syncLogs.map(async (log) => {
          await db.run(`
            UPDATE sync_logs 
            SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [batchError instanceof Error ? batchError.message : 'Unknown error', log.id]);
        }));
        
        totalErrors += batch.length;
      }
    }

    console.log(`Cron job completed: ${totalProcessed} items processed, ${totalErrors} errors`);

    return res.status(200).json({
      success: true,
      message: 'Cron job completed',
      processed: totalProcessed,
      errors: totalErrors,
      batches: batches.length,
    });

  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
