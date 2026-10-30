const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app'); 
const { getFirestore } = require('firebase-admin/firestore');  

const RSS_URL = 'https://www.thebbnpost.in/feeds/posts/default?alt=json&max-results=1';
const STATE_FILE = path.join(__dirname, 'last_post.json');

// 1. Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount) 
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

const db = getFirestore();

// Helper function to send push notifications
async function sendPushNotifications(tokens, title, body) {
  const chunkSize = 100;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    
    const messages = chunk.map(token => ({
      to: token,
      title: title,
      body: body,
      sound: "default"
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    });

    // Check for uninstalled devices and clean them
    const responseData = await response.json();
    if (responseData.data) {
      for (let j = 0; j < responseData.data.length; j++) {
        const ticket = responseData.data[j];
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          const deadToken = chunk[j];
          console.log(`🗑️ Deleting uninstalled device token: ${deadToken}`);
          await db.collection('push_tokens').doc(deadToken).delete();
        }
      }
    }
  }
}

async function checkFeed() {
  try {
    // ==========================================
    // PART 1: CHECK SCHEDULED ALERTS
    // ==========================================
    const now = new Date();
    const scheduledSnapshot = await db.collection('scheduled_alerts')
      .where('status', '==', 'pending')
      .get();

    if (!scheduledSnapshot.empty) {
      console.log(`Found ${scheduledSnapshot.size} pending scheduled alerts.`);
      const tokensSnapshot = await db.collection('push_tokens').get();
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      for (const alertDoc of scheduledSnapshot.docs) {
        const alertData = alertDoc.data();
        
        // Convert Firestore timestamp to JS Date
        const sendAtDate = alertData.sendAt.toDate(); 
        
        if (sendAtDate <= now) {
          console.log(`⏰ Sending scheduled alert: ${alertData.title}`);
          await sendPushNotifications(tokens, alertData.title, alertData.message);
          
          // Mark as sent so it doesn't send again
          await db.collection('scheduled_alerts').doc(alertDoc.id).update({ status: 'sent' });
        }
      }
    }

    // ==========================================
    // PART 2: CHECK BLOGGER RSS FEED
    // ==========================================
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

    if (latestId !== lastSeenId) {
      console.log(`New blog post found: ${title}`);
      const tokensSnapshot = await db.collection('push_tokens').get();
      const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

      if (tokens.length > 0) {
        console.log(`📊 TOTAL INSTALLED DEVICES: ${tokens.length}`);
        await sendPushNotifications(tokens, "Breaking News from The BBN Post! 🚨", title);
      }

      fs.writeFileSync(STATE_FILE, JSON.stringify({ lastId: latestId }));
      console.log('Blogger notifications sent and state saved.');
    } else {
      console.log('No new Blogger posts. Exiting RSS check.');
    }

  } catch (error) {
    console.error('Error checking feed or scheduled alerts:', error);
  }
}

checkFeed();