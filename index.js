const express = require('express');
const { Resend } = require('resend');
const admin = require('firebase-admin');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.get('/', (req, res) => {
  res.send('HVAC Reminder Server is running..');
});

// Schedule: every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Running daily email check...');

  const snapshot = await db.collection('clients').get();
  const now = new Date();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const lastCleanDate = new Date(data.lastCleanDate);

    const oneYearLater = new Date(lastCleanDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const timeDiff = oneYearLater - now;
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysLeft === 0) {
      try {
        await resend.emails.send({
          from: 'hvac-reminder@resend.dev',
          to: data.email,
          subject: '⏰ Time to Clean Your HVAC System!',
          html: `<p>Hi ${data.name},</p>
                 <p>It’s been a year since your last HVAC cleaning on ${lastCleanDate.toDateString()}.</p>
                 <p>Please schedule a new cleaning appointment today!</p>
                 <p>— Your HVAC Team</p>`
        });
        console.log(`✅ Email sent to ${data.email}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${data.email}:`, error);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

