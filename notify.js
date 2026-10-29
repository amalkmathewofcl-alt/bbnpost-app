const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app'); // 👈 NEW IMPORT
const { getFirestore } = require('firebase-admin/firestore');  // 👈 NEW IMPORT

const RSS_URL = 'https://www.thebbnpost.in/feeds/posts/default?alt=json&max-results=1';
const STATE_FILE = path.join(__dirname, 'last_post.json');

// 1. Initialize Firebase Admin using the GitHub Secret
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount) // 👈 NEW SYNTAX
    });
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase. Check your Secret JSON format:", error);
    process.exit(1);
  }
} else {
  console.log("No Firebase credentials found. Skipping...");
  process.exit(1);
}

async function checkFeed() {
  try {
    const res = await fetch(RSS_URL);
    const data = await res.json();

    if (!data.feed || !data.feed.entry) return;

    const latestPost = data.feed.entry[0];
    const latestId = latestPost.id.$t;
    const title = latestPost.title.$t;

    let lastSeenId = null;
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      lastSeenId = state.lastId;
    }

    if (latestId === lastSeenId) {
      console.log('No new posts. Exiting.');
      return;
    }

    console.log(`New post found: ${title}`);

    // 2. Fetch all tokens from Firestore
    const db = getFirestore(); // 👈 NEW SYNTAX
    const tokensSnapshot = await db.collection('push_tokens').get();
    
    if (tokensSnapshot.empty) {
      console.log('No push tokens in database. Exiting.');
      return;
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);
    console.log(`Sending notification to ${tokens.length} devices...`);

    // 3. Send notifications in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      
      const messages = chunk.map(token => ({
        to: token,
        title: "Breaking News from The BBN Post! 🚨",
        body: title,
        sound: "default"
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages)
      });
    }

    // 4. Save the new ID
    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastId: latestId }));
    console.log('Notifications sent and state saved.');

  } catch (error) {
    console.error('Error checking feed or sending notifications:', error);
  }
}

checkFeed();
