const fs = require('fs');
const path = require('path');

// YOUR PERSONAL PUSH TOKEN
const EXPO_PUSH_TOKEN = 'ExponentPushToken[znjyEPHxFCDUntxyXGRas6]';
const RSS_URL = 'https://www.thebbnpost.in/feeds/posts/default?alt=json&max-results=1';
const STATE_FILE = path.join(__dirname, 'last_post.json');

async function checkFeed() {
  try {
    const res = await fetch(RSS_URL);
    const data = await res.json();
    
    if (!data.feed || !data.feed.entry) return;
    
    const latestPost = data.feed.entry[0];
    const latestId = latestPost.id.$t;
    const title = latestPost.title.$t;
    const link = latestPost.link.find(l => l.rel === 'alternate')?.href;

    let lastSeenId = null;
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      lastSeenId = state.lastId;
    }

    if (latestId !== lastSeenId) {
      console.log('New post found:', title);
      
      fs.writeFileSync(STATE_FILE, JSON.stringify({ lastId: latestId }));

      const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: EXPO_PUSH_TOKEN,
          title: 'Breaking News from The BBN Post! 🚨',
          body: title,
          data: { url: link },
          sound: 'default',
        }),
      });
      console.log('Notification sent:', await pushRes.json());
    } else {
      console.log('No new posts.');
    }
  } catch (error) {
    console.error('Error checking feed:', error);
  }
}

checkFeed();