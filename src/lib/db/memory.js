// In-memory database for Vercel serverless environment
// This is a simple fallback when SQLite is not available

let memoryDb = {
  creators: [],
  posts: [],
  post_stats: [],
  creator_stats_daily: [],
  sync_logs: [],
  post_stats_original: [],
  users: [
    {
      id: 1,
      email: 'demo@example.com',
      password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
      first_name: 'John',
      last_name: 'Doe',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    }
  ]
};

// Helper functions to simulate database operations
const db = {
  prepare: (query) => {
    return {
      run: (...params) => {
        // Simple mock for INSERT operations
        if (query.includes('INSERT INTO creators')) {
          const id = memoryDb.creators.length + 1;
          memoryDb.creators.push({
            id,
            username: params[0],
            display_name: params[1],
            platform: params[2] || 'tiktok',
            is_active: 1,
            created_at: new Date().toISOString()
          });
          return { lastInsertRowid: id, changes: 1 };
        }
        
        if (query.includes('INSERT INTO posts')) {
          const id = memoryDb.posts.length + 1;
          memoryDb.posts.push({
            id,
            creator_id: params[0],
            external_id: params[1],
            platform: params[2] || 'tiktok',
            caption: params[3],
            thumbnail_url: params[4],
            post_url: params[5],
            published_at: params[6],
            created_at: new Date().toISOString()
          });
          return { lastInsertRowid: id, changes: 1 };
        }
        
        if (query.includes('INSERT INTO post_stats')) {
          const id = memoryDb.post_stats.length + 1;
          memoryDb.post_stats.push({
            id,
            post_id: params[0],
            views: params[1] || 0,
            likes: params[2] || 0,
            comments: params[3] || 0,
            shares: params[4] || 0,
            engagement_rate: params[5] || 0,
            recorded_at: new Date().toISOString()
          });
          return { lastInsertRowid: id, changes: 1 };
        }
        
        if (query.includes('INSERT INTO post_stats_original')) {
          const id = memoryDb.post_stats_original.length + 1;
          memoryDb.post_stats_original.push({
            id,
            post_id: params[0],
            views: params[1],
            likes: params[2],
            comments: params[3],
            shares: params[4],
            created_at: new Date().toISOString()
          });
          return { lastInsertRowid: id, changes: 1 };
        }
        
        return { lastInsertRowid: 0, changes: 0 };
      },
      
      get: (...params) => {
        // Simple mock for SELECT operations
        if (query.includes('SELECT * FROM creators WHERE')) {
          return memoryDb.creators.find(c => c.id === params[0]) || null;
        }
        
        if (query.includes('SELECT * FROM users WHERE')) {
          return memoryDb.users.find(u => u.email === params[0]) || null;
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM creators')) {
          return { count: memoryDb.creators.length };
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM posts')) {
          return { count: memoryDb.posts.length };
        }
        
        if (query.includes('SELECT COUNT(*) as count FROM post_stats')) {
          return { count: memoryDb.post_stats.length };
        }
        
        if (query.includes('SELECT SUM(views) as total FROM post_stats')) {
          const total = memoryDb.post_stats.reduce((sum, stat) => sum + (stat.views || 0), 0);
          return { total };
        }
        
        return null;
      },
      
      all: (...params) => {
        // Simple mock for SELECT all operations
        if (query.includes('FROM creators') && !query.includes('WHERE')) {
          return memoryDb.creators;
        }
        
        if (query.includes('FROM posts') && !query.includes('WHERE')) {
          return memoryDb.posts;
        }
        
        if (query.includes('FROM post_stats') && !query.includes('WHERE')) {
          return memoryDb.post_stats;
        }
        
        if (query.includes('FROM creators c LEFT JOIN posts p')) {
          // Mock the complex query for payment data
          return memoryDb.creators.map(creator => ({
            creator_id: creator.id,
            username: creator.username,
            display_name: creator.display_name,
            first_post_date: new Date().toISOString(),
            total_posts: memoryDb.posts.filter(p => p.creator_id === creator.id).length
          }));
        }
        
        return [];
      }
    };
  },
  
  exec: (query) => {
    // Mock for schema execution
    console.log('Executing query:', query);
  },
  
  pragma: (setting) => {
    // Mock for pragma settings
    console.log('Setting pragma:', setting);
  }
};

module.exports = db;
