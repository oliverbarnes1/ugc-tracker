const fetch = require('node-fetch');

async function testCronEndpoint() {
  const url = 'http://localhost:3000/api/cron/run';
  const cronSecret = process.env.CRON_SECRET || 'test-secret';
  
  console.log('Testing cron endpoint...');
  console.log('URL:', url);
  console.log('Secret:', cronSecret);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-key': cronSecret,
      },
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Cron endpoint test successful!');
    } else {
      console.log('❌ Cron endpoint test failed');
    }
  } catch (error) {
    console.error('❌ Error testing cron endpoint:', error.message);
  }
}

testCronEndpoint();
