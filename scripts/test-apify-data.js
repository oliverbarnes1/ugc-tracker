const https = require('https');

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testApifyData() {
  const APIFY_TOKEN = process.env.APIFY_TOKEN || 'YOUR_APIFY_TOKEN_HERE';
  const TASK_ID = 'vB0foLluLnDBEWNgL';
  
  const input = {
    excludePinnedPosts: false,
    profileScrapeSections: ["videos"],
    profileSorting: "latest",
    profiles: ["_carlapicks_"],
    proxyCountryCode: "None",
    resultsPerPage: 3,
    scrapeRelatedVideos: false,
    shouldDownloadAvatars: false,
    shouldDownloadCovers: false,
    shouldDownloadMusicCovers: false,
    shouldDownloadSlideshowImages: false,
    shouldDownloadSubtitles: false,
    shouldDownloadVideos: false,
    searchSection: "",
    maxProfilesPerQuery: 10
  };

  console.log('Starting Apify task...');
  
  // Start the task
  const runData = await httpsRequest(`https://api.apify.com/v2/actor-tasks/${TASK_ID}/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APIFY_TOKEN}`
    },
    body: JSON.stringify(input)
  });

  console.log('Task started:', runData.data.id);

  // Wait for task to complete
  let status = 'RUNNING';
  let attempts = 0;
  const maxAttempts = 30;

  while (status === 'RUNNING' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusData = await httpsRequest(`https://api.apify.com/v2/actor-runs/${runData.data.id}`, {
      headers: {
        'Authorization': `Bearer ${APIFY_TOKEN}`
      }
    });
    
    status = statusData.data.status;
    attempts++;
    
    console.log(`Attempt ${attempts}: Status = ${status}`);
  }

  if (status !== 'SUCCEEDED') {
    console.log('Task failed or timed out. Final status:', status);
    return;
  }

  // Get the results
  const datasetId = runData.data.defaultDatasetId;
  const items = await httpsRequest(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: {
      'Authorization': `Bearer ${APIFY_TOKEN}`
    }
  });
  
  console.log('\n=== FIRST ITEM STRUCTURE ===');
  console.log(JSON.stringify(items[0], null, 2));
  
  console.log('\n=== KEY FIELDS FOR POST_STATS ===');
  console.log('id:', items[0].id);
  console.log('playCount:', items[0].playCount);
  console.log('diggCount:', items[0].diggCount);
  console.log('commentCount:', items[0].commentCount);
  console.log('shareCount:', items[0].shareCount);
  console.log('text:', items[0].text);
  console.log('webVideoUrl:', items[0].webVideoUrl);
}

testApifyData().catch(console.error);
