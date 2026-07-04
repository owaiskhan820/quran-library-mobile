async function test() {
  const endpoints = [
    'https://accounts.google.com/.well-known/openid-configuration',
    'https://oauth2.googleapis.com/token',
    'https://openidconnect.googleapis.com/v1/userinfo'
  ];

  for (const url of endpoints) {
    try {
      console.log(`Testing ${url}...`);
      const res = await fetch(url);
      console.log(`  Status: ${res.status}`);
    } catch (err) {
      console.error(`  Fetch failed for ${url}:`, err.message);
    }
  }
}

test();
