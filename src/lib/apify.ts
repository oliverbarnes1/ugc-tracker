// Real Apify client implementation
// Note: This requires Node.js 16+ for full functionality
// For Node.js 14, we'll use a fetch-based approach

interface ApifyClient {
  actor: (id: string) => {
    call: (input: any, options: any) => Promise<{ status: string; defaultDatasetId: string }>;
  };
  task: (id: string) => {
    call: (input: any, options: any) => Promise<{ status: string; defaultDatasetId: string }>;
  };
  dataset: (id: string) => {
    listItems: () => Promise<{ items: any[] }>;
  };
}

// Real Apify client using fetch API (Node.js 14 compatible)
const apifyClient: ApifyClient = {
  actor: (id: string) => ({
    call: async (input: any, options: any) => {
      console.log(`Running real Apify actor ${id} with:`, input);
      
      const token = process.env.APIFY_TOKEN;
      if (!token) {
        throw new Error('APIFY_TOKEN not found in environment variables');
      }

      // Start the actor run
      const startResponse = await fetch(`https://api.apify.com/v2/acts/${id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input,
          waitForFinish: 30, // Wait up to 30 seconds
        }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.text();
        throw new Error(`Failed to start actor: ${error}`);
      }

      const runData = await startResponse.json();
      console.log(`Actor run started: ${runData.data.id}`);

      // Wait for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runData.data.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check run status');
        }

        const statusData = await statusResponse.json();
        console.log(`Run status: ${statusData.data.status}`);

        if (statusData.data.status === 'SUCCEEDED') {
          return {
            status: 'SUCCEEDED',
            defaultDatasetId: statusData.data.defaultDatasetId
          };
        } else if (statusData.data.status === 'FAILED' || statusData.data.status === 'ABORTED') {
          throw new Error(`Actor run failed with status: ${statusData.data.status}`);
        }

        attempts++;
      }

      throw new Error('Actor run timed out');
    }
  }),
  task: (id: string) => ({
    call: async (input: any, options: any) => {
      console.log(`Running real Apify task ${id} with:`, input);
      
      const token = process.env.APIFY_TOKEN;
      if (!token) {
        throw new Error('APIFY_TOKEN not found in environment variables');
      }

      // Start the task run
      const startResponse = await fetch(`https://api.apify.com/v2/actor-tasks/${id}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input,
          waitForFinish: 30, // Wait up to 30 seconds
        }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.text();
        throw new Error(`Failed to start task: ${error}`);
      }

      const runData = await startResponse.json();
      console.log(`Task run started: ${runData.data.id}`);

      // Wait for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runData.data.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check run status');
        }

        const statusData = await statusResponse.json();
        console.log(`Run status: ${statusData.data.status}`);

        if (statusData.data.status === 'SUCCEEDED') {
          return {
            status: 'SUCCEEDED',
            defaultDatasetId: statusData.data.defaultDatasetId
          };
        } else if (statusData.data.status === 'FAILED' || statusData.data.status === 'ABORTED') {
          throw new Error(`Task run failed with status: ${statusData.data.status}`);
        }

        attempts++;
      }

      throw new Error('Task run timed out');
    }
  }),
  dataset: (id: string) => ({
    listItems: async () => {
      console.log(`Fetching items from dataset ${id}`);
      
      const token = process.env.APIFY_TOKEN;
      if (!token) {
        throw new Error('APIFY_TOKEN not found in environment variables');
      }

      const response = await fetch(`https://api.apify.com/v2/datasets/${id}/items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch dataset items: ${error}`);
      }

      const items = await response.json();
      console.log(`Fetched ${items.length} items from dataset`);
      
      return { items };
    }
  })
};

export interface ApifyRunResult {
  success: boolean;
  items: any[];
  error?: string;
}

export interface CreatorBatch {
  id: number;
  handle: string;
  platform: string;
}

/**
 * Run the TikTok Profile Scraper actor for a batch of creators
 */
export async function runTikTokScraper(
  creators: CreatorBatch[],
  taskId: string
): Promise<ApifyRunResult> {
  try {
    console.log(`Running TikTok scraper for ${creators.length} creators:`, creators.map(c => c.handle));

    // Prepare input for the task using the exact format provided
    const input = {
      excludePinnedPosts: false,
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
      profiles: creators.map(creator => `@${creator.handle}`),
      proxyCountryCode: "None",
      resultsPerPage: 10,
      scrapeRelatedVideos: false,
      shouldDownloadAvatars: false,
      shouldDownloadCovers: false,
      shouldDownloadMusicCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadSubtitles: false,
      shouldDownloadVideos: false
    };

    // Start the task run
    const run = await apifyClient.task(taskId).call(input, {
      waitSecs: 60, // Wait up to 60 seconds for completion
      timeout: 600, // 10 minute timeout
    });

    console.log(`Actor run completed with status: ${run.status}`);

    if (run.status !== 'SUCCEEDED') {
      return {
        success: false,
        items: [],
        error: `Actor run failed with status: ${run.status}`,
      };
    }

    // Fetch the results from the dataset
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    console.log(`Fetched ${items.length} items from dataset`);
    
    // Log the first item to see the structure
    if (items.length > 0) {
      console.log('First item structure:', JSON.stringify(items[0], null, 2));
    }

    return {
      success: true,
      items: items || [],
    };
  } catch (error) {
    console.error('Error running TikTok scraper:', error);
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Normalize Apify item into Post and PostStat models - handles real Apify TikTok scraper payloads
 */
export function normalizeApifyItem(
  item: any,
  creatorId: number
): { post: any; stat: any } | null {
  try {
    // Extract postId: item.id OR item.itemId OR item.video?.id
    const postId = item.id || item.itemId || item.video?.id;
    
    // Extract caption: item.text OR item.desc
    const caption = item.text || item.desc || '';
    
    // Extract publishedAt: item.createTimeISO OR new Date(item.createTime * 1000)
    let publishedAt;
    if (item.createTimeISO) {
      publishedAt = new Date(item.createTimeISO).toISOString();
    } else if (item.createTime) {
      publishedAt = new Date(item.createTime * 1000).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }
    
    // Extract authorHandle: item.authorMeta?.name OR item.author?.uniqueId
    const authorHandle = item.authorMeta?.name || item.author?.uniqueId || '';
    
    // Extract stats: use either item.stats OR root-level equivalents
    const stats = item.stats || item;
    const views = parseInt(stats.playCount || stats.play_count || stats.views || '0') || 0;
    const likes = parseInt(stats.diggCount || stats.digg_count || stats.likes || '0') || 0;
    const comments = parseInt(stats.commentCount || stats.comment_count || stats.comments || '0') || 0;
    const shares = parseInt(stats.shareCount || stats.share_count || stats.shares || '0') || 0;
    
    // Extract thumbnail: item.thumbnailUrl OR item.cover OR item.video?.cover
    const thumbnail = item.thumbnailUrl || item.cover || item.video?.cover || item.videoMeta?.coverUrl || '';
    
    // Extract url: item.url OR item.shareUrl OR item.webVideoUrl
    const url = item.url || item.shareUrl || item.webVideoUrl || '';

    if (!postId) {
      console.error('Missing postId in item:', { id: item.id, authorMeta: item.authorMeta });
      return null;
    }

    if (!url) {
      console.error('Missing URL in item:', { id: postId, authorHandle, webVideoUrl: item.webVideoUrl });
      return null;
    }

    // Calculate engagement rate
    const engagementRate = views > 0 ? (likes + comments + shares) / views : 0;

    const post = {
      creator_id: creatorId,
      external_id: postId.toString(),
      platform: 'tiktok',
      content_type: 'video',
      caption: caption,
      media_url: url,
      thumbnail_url: thumbnail,
      post_url: url,
      published_at: publishedAt,
    };

    const stat = {
      likes: likes,
      comments: comments,
      shares: shares,
      views: views,
      engagement_rate: engagementRate,
    };

    return { post, stat };
  } catch (error) {
    console.error('Error normalizing Apify item:', error, { id: item.id, authorMeta: item.authorMeta });
    return null;
  }
}

/**
 * Legacy function - kept for backward compatibility
 */
export function normalizeItemToPostAndStat(
  item: any,
  creatorId: number
): { post: any; stat: any } | null {
  try {
    // Extract basic post information
    const postId = item.id || item.postId || item.videoId;
    const url = item.webVideoUrl || item.url || item.videoUrl;
    const thumbnail = item.videoMeta?.coverUrl || item.thumbnail || item.cover || item.thumbnailUrl;
    const caption = item.text || item.description || item.caption || '';
    const publishedAt = item.createTimeISO || item.createTime || item.timestamp || item.publishedAt;

    if (!postId || !url) {
      console.warn('Skipping item - missing required fields:', { postId, url });
      return null;
    }


    // Extract statistics
    const views = parseInt(item.playCount || item.views || item.viewCount || '0') || 0;
    const likes = parseInt(item.diggCount || item.likes || item.likeCount || '0') || 0;
    const comments = parseInt(item.commentCount || item.comments || '0') || 0;
    const shares = parseInt(item.shareCount || item.shares || '0') || 0;
    const saves = 0; // N/A - saves data not available in current API

    // Calculate engagement rate
    const engagementRate = views > 0 ? (likes + comments + shares) / views : 0;

    const post = {
      creator_id: creatorId,
      external_id: postId.toString(),
      platform: 'tiktok',
      content_type: 'video',
      caption: caption,
      media_url: url,
      thumbnail_url: thumbnail,
      post_url: url,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
    };

    const stat = {
      post_id: null, // Will be set after post is created
      likes: likes,
      comments: comments,
      shares: shares,
      views: views,
      saves: saves,
      engagement_rate: engagementRate,
    };

    return { post, stat };
  } catch (error) {
    console.error('Error normalizing item:', error, item);
    return null;
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
