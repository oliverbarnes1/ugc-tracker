const https = require('https');

const APIFY_TOKEN = process.env.APIFY_TOKEN || 'apify_api_iigw89hnBNdZgS6NWs2WhT4mpM4Rk324765q';
const APIFY_TASK_ID = 'H6Xz1pDsT21HYz9R9';
const CREATOR_HANDLE = '@_carlapicks_';

async function runApifyTaskAndFetchData() {
  console.log('Starting new Apify task...');
  try {
    // 1. Start the Apify task
    const startTaskOptions = {
      hostname: 'api.apify.com',
      path: `/v2/actor-tasks/${APIFY_TASK_ID}/runs?token=${APIFY_TOKEN}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const taskInput = {
      excludePinnedPosts: false,
      profileScrapeSections: ["videos"],
      profileSorting: "latest",
      profiles: [CREATOR_HANDLE],
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

    const startTaskResponse = await new Promise((resolve, reject) => {
      const req = https.request(startTaskOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
      req.write(JSON.stringify(taskInput));
      req.end();
    });

    const runId = startTaskResponse.data.id;
    const defaultDatasetId = startTaskResponse.data.defaultDatasetId;
    console.log(`Apify task started. Run ID: ${runId}, Default Dataset ID: ${defaultDatasetId}`);

    // 2. Poll for task completion
    let runStatus = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 5000;

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const getStatusOptions = {
        hostname: 'api.apify.com',
        path: `/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`,
        method: 'GET',
      };

      const statusResponse = await new Promise((resolve, reject) => {
        https.get(getStatusOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      runStatus = statusResponse.data.status;
      console.log(`Run status: ${runStatus} (Attempt ${++attempts}/${maxAttempts})`);
    }

    if (runStatus !== 'SUCCEEDED') {
      throw new Error(`Apify task did not succeed. Final status: ${runStatus}`);
    }

    // 3. Fetch items from the dataset
    console.log('Fetching items from dataset...');
    const getItemsOptions = {
      hostname: 'api.apify.com',
      path: `/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`,
      method: 'GET',
    };

    const itemsResponse = await new Promise((resolve, reject) => {
      https.get(getItemsOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    console.log(`\n=== FOUND ${itemsResponse.length} ITEMS ===`);
    
    // Show first item structure
    if (itemsResponse.length > 0) {
      console.log('\n=== FIRST ITEM STRUCTURE ===');
      console.log(JSON.stringify(itemsResponse[0], null, 2));
      
      // Show key fields for stats
      const item = itemsResponse[0];
      console.log('\n=== KEY FIELDS FOR STATS ===');
      console.log('id:', item.id);
      console.log('playCount:', item.playCount);
      console.log('diggCount:', item.diggCount);
      console.log('commentCount:', item.commentCount);
      console.log('shareCount:', item.shareCount);
      console.log('text:', item.text);
      console.log('webVideoUrl:', item.webVideoUrl);
      console.log('authorMeta.name:', item.authorMeta?.name);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

runApifyTaskAndFetchData();
