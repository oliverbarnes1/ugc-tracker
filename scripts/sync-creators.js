const db = require('../src/lib/db');

// List of creators to add
const creators = [
  'leo.picks',
  'blion.picks',
  'kat.picks',
  'victoria_picks',
  'ben_picks_',
  'klara.picks',
  'josh.picks',
  'carlos.picks_',
  'fisapicks',
  '_carlapicks_'
];

async function addCreatorsAndSync() {
  try {
    console.log('Starting creator sync process...');

    // First, add creators to database
    console.log('Adding creators to database...');
    
    // Create a default workspace first
    const workspaceId = db.prepare(`
      INSERT OR IGNORE INTO workspaces (id, name, slug, description)
      VALUES (1, 'Default Workspace', 'default', 'Main workspace for UGC tracking')
    `).run().lastInsertRowid || 1;

    // Add each creator
    const creatorIds = [];
    for (const username of creators) {
      const result = db.prepare(`
        INSERT OR IGNORE INTO creators (workspace_id, external_id, platform, username, display_name, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(workspaceId, username, 'tiktok', username, username, 1);
      
      if (result.changes > 0) {
        creatorIds.push(result.lastInsertRowid);
        console.log(`✓ Added creator: @${username}`);
      } else {
        // Creator already exists, get their ID
        const existing = db.prepare('SELECT id FROM creators WHERE username = ?').get(username);
        if (existing) {
          creatorIds.push(existing.id);
          console.log(`✓ Creator already exists: @${username}`);
        }
      }
    }

    console.log(`\nAdded ${creatorIds.length} creators to database`);

    // Now run the Apify sync
    console.log('\nStarting Apify sync...');
    
    const taskId = process.env.APIFY_ACTOR_ID || 'H6Xz1pDsT21HYz9R9';
    console.log(`Using Apify task ID: ${taskId}`);

    // Prepare creator batch for Apify
    const creatorBatch = creators.map((username, index) => ({
      id: creatorIds[index] || (index + 1),
      handle: username,
      platform: 'tiktok'
    }));

    // Run the TikTok scraper
    const result = await runTikTokScraper(creatorBatch, taskId);
    
    if (!result.success) {
      console.error('Apify sync failed:', result.error);
      return;
    }

    console.log(`\nApify sync completed successfully!`);
    console.log(`Fetched ${result.items.length} items`);

    // Process the results and save to database
    console.log('\nProcessing and saving data...');
    
    let processedCount = 0;
    let errorCount = 0;

    for (const item of result.items) {
      try {
        // Find the creator for this item
        let creator = null;
        
        // Try authorMeta.name first (TikTok format)
        if (item.authorMeta && item.authorMeta.name) {
          creator = creatorBatch.find(c => c.handle === item.authorMeta.name);
        }
        
        // Fallback to URL extraction
        if (!creator && item.webVideoUrl) {
          const urlMatch = item.webVideoUrl.match(/@([^/]+)/);
          if (urlMatch) {
            const usernameFromUrl = urlMatch[1];
            creator = creatorBatch.find(c => c.handle === usernameFromUrl);
          }
        }
        
        if (!creator) {
          console.warn('Could not find creator for item:', { 
            id: item.id, 
            authorMeta: item.authorMeta, 
            webVideoUrl: item.webVideoUrl 
          });
          continue;
        }

        // Normalize the item
        const normalized = normalizeApifyItem(item, creator.id);
        if (!normalized) {
          console.warn('Failed to normalize item:', { id: item.id });
          continue;
        }

        // Insert post
        const postResult = db.prepare(`
          INSERT OR IGNORE INTO posts (
            creator_id, external_id, platform, content_type, caption,
            media_url, thumbnail_url, post_url, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          normalized.post.creator_id,
          normalized.post.external_id,
          normalized.post.platform,
          normalized.post.content_type,
          normalized.post.caption,
          normalized.post.media_url,
          normalized.post.thumbnail_url,
          normalized.post.post_url,
          normalized.post.published_at
        );

        if (postResult.changes > 0) {
          const postId = postResult.lastInsertRowid;
          
          // Insert post stats
          db.prepare(`
            INSERT OR IGNORE INTO post_stats (
              post_id, likes, comments, shares, views, engagement_rate
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            postId,
            normalized.stat.likes,
            normalized.stat.comments,
            normalized.stat.shares,
            normalized.stat.views,
            normalized.stat.engagement_rate
          );
          
          processedCount++;
        }

      } catch (error) {
        console.error('Error processing item:', error);
        errorCount++;
      }
    }

    console.log(`\nSync completed!`);
    console.log(`✓ Processed: ${processedCount} posts`);
    console.log(`✗ Errors: ${errorCount} items`);

    // Show summary
    const totalCreators = db.prepare('SELECT COUNT(*) as count FROM creators WHERE is_active = 1').get().count;
    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
    const totalViews = db.prepare('SELECT SUM(views) as total FROM post_stats').get().total || 0;

    console.log(`\nDatabase Summary:`);
    console.log(`- Creators: ${totalCreators}`);
    console.log(`- Posts: ${totalPosts}`);
    console.log(`- Total Views: ${totalViews.toLocaleString()}`);

  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Run the sync
addCreatorsAndSync().then(() => {
  console.log('\nSync process completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Sync process failed:', error);
  process.exit(1);
});
