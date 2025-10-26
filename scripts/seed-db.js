const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'ugc-tracker.db');
const db = new Database(dbPath);

console.log('Seeding database...');

try {
  // Create workspace
  const workspaceStmt = db.prepare(`
    INSERT INTO workspaces (name, slug, description) 
    VALUES (?, ?, ?)
  `);
  
  const workspace = workspaceStmt.run(
    'Demo Workspace',
    'demo-workspace',
    'A demo workspace for testing UGC tracking'
  );
  
  const workspaceId = workspace.lastInsertRowid;
  console.log('✓ Created workspace:', workspaceId);

  // Create user (linked to external auth)
  const userStmt = db.prepare(`
    INSERT INTO users (external_id, email, first_name, last_name, avatar_url) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const user = userStmt.run(
    'clerk_user_123', // Placeholder Clerk user ID
    'demo@example.com',
    'John',
    'Doe',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  );
  
  const userId = user.lastInsertRowid;
  console.log('✓ Created user:', userId);

  // Create workspace membership
  const membershipStmt = db.prepare(`
    INSERT INTO workspace_members (workspace_id, user_id, role) 
    VALUES (?, ?, ?)
  `);
  
  membershipStmt.run(workspaceId, userId, 'owner');
  console.log('✓ Created workspace membership');

  // Create 3 example creators
  const creators = [
    {
      external_id: 'creator_1',
      platform: 'instagram',
      username: 'fashionista_jane',
      display_name: 'Jane Smith',
      follower_count: 12500,
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      external_id: 'creator_2',
      platform: 'tiktok',
      username: 'tech_reviewer_mike',
      display_name: 'Mike Johnson',
      follower_count: 45000,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    {
      external_id: 'creator_3',
      platform: 'youtube',
      username: 'cooking_with_sarah',
      display_name: 'Sarah Wilson',
      follower_count: 8900,
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    }
  ];

  const creatorStmt = db.prepare(`
    INSERT INTO creators (workspace_id, external_id, platform, username, display_name, follower_count, avatar_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const creatorIds = [];
  creators.forEach(creator => {
    const result = creatorStmt.run(
      workspaceId,
      creator.external_id,
      creator.platform,
      creator.username,
      creator.display_name,
      creator.follower_count,
      creator.avatar_url
    );
    creatorIds.push(result.lastInsertRowid);
    console.log(`✓ Created creator: ${creator.username}`);
  });

  // Create some sample posts
  const posts = [
    {
      creator_id: creatorIds[0],
      external_id: 'post_1',
      platform: 'instagram',
      content_type: 'image',
      caption: 'Just discovered this amazing new skincare routine! #skincare #beauty',
      media_url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop',
      post_url: 'https://instagram.com/p/example1',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      creator_id: creatorIds[1],
      external_id: 'post_2',
      platform: 'tiktok',
      content_type: 'video',
      caption: 'This new phone is incredible! Here\'s my honest review 📱',
      media_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
      post_url: 'https://tiktok.com/@tech_reviewer_mike/video/example2',
      published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      creator_id: creatorIds[2],
      external_id: 'post_3',
      platform: 'youtube',
      content_type: 'video',
      caption: 'Easy 15-minute pasta recipe that will blow your mind! 🍝',
      media_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=400&fit=crop',
      post_url: 'https://youtube.com/watch?v=example3',
      published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const postStmt = db.prepare(`
    INSERT INTO posts (creator_id, external_id, platform, content_type, caption, media_url, post_url, published_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const postIds = [];
  posts.forEach(post => {
    const result = postStmt.run(
      post.creator_id,
      post.external_id,
      post.platform,
      post.content_type,
      post.caption,
      post.media_url,
      post.post_url,
      post.published_at
    );
    postIds.push(result.lastInsertRowid);
    console.log(`✓ Created post: ${post.caption.substring(0, 50)}...`);
  });

  // Create post statistics
  const postStats = [
    { post_id: postIds[0], likes: 1250, comments: 89, shares: 45, views: 5600, engagement_rate: 0.12 },
    { post_id: postIds[1], likes: 3200, comments: 156, shares: 78, views: 12500, engagement_rate: 0.15 },
    { post_id: postIds[2], likes: 890, comments: 67, shares: 23, views: 3200, engagement_rate: 0.08 }
  ];

  const postStatsStmt = db.prepare(`
    INSERT INTO post_stats (post_id, likes, comments, shares, views, engagement_rate) 
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  postStats.forEach(stats => {
    postStatsStmt.run(
      stats.post_id,
      stats.likes,
      stats.comments,
      stats.shares,
      stats.views,
      stats.engagement_rate
    );
    console.log(`✓ Created post stats for post ${stats.post_id}`);
  });

  // Create daily creator statistics
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const creatorStatsStmt = db.prepare(`
    INSERT INTO creator_stats_daily (creator_id, date, follower_count, posts_count, total_likes, total_comments, total_shares, total_views, avg_engagement_rate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  creatorIds.forEach((creatorId, index) => {
    // Today's stats
    creatorStatsStmt.run(
      creatorId,
      today,
      creators[index].follower_count + Math.floor(Math.random() * 100),
      Math.floor(Math.random() * 3) + 1,
      Math.floor(Math.random() * 1000) + 500,
      Math.floor(Math.random() * 100) + 50,
      Math.floor(Math.random() * 50) + 20,
      Math.floor(Math.random() * 5000) + 2000,
      Math.random() * 0.1 + 0.05
    );

    // Yesterday's stats
    creatorStatsStmt.run(
      creatorId,
      yesterday,
      creators[index].follower_count,
      Math.floor(Math.random() * 2) + 1,
      Math.floor(Math.random() * 800) + 300,
      Math.floor(Math.random() * 80) + 30,
      Math.floor(Math.random() * 40) + 15,
      Math.floor(Math.random() * 4000) + 1500,
      Math.random() * 0.08 + 0.03
    );

    console.log(`✓ Created daily stats for creator ${creatorId}`);
  });

  // Create sync log
  const syncLogStmt = db.prepare(`
    INSERT INTO sync_logs (workspace_id, platform, sync_type, status, records_processed, records_created, records_updated, started_at, completed_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  syncLogStmt.run(
    workspaceId,
    'instagram',
    'creators',
    'success',
    1,
    1,
    0,
    new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    new Date(Date.now() - 60 * 60 * 1000 + 30 * 1000).toISOString()
  );

  console.log('✓ Created sync log');

  console.log('\n🎉 Database seeded successfully!');
  console.log(`📊 Created:`);
  console.log(`   - 1 workspace`);
  console.log(`   - 1 user`);
  console.log(`   - 3 creators`);
  console.log(`   - 3 posts`);
  console.log(`   - 3 post stats`);
  console.log(`   - 6 daily creator stats`);
  console.log(`   - 1 sync log`);

} catch (error) {
  console.error('Error seeding database:', error);
} finally {
  db.close();
}
