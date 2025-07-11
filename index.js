const admin = require('firebase-admin');
const { Resend } = require('resend');
const cron = require('node-cron');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email Template
function generateEmail(name) {
  return {
    from: 'noreply@yourdomain.com',
    to: '', // filled dynamically
    subject: 'Reminder: HVAC Maintenance Due Soon',
    html: `<p>Hi ${name},</p>
           <p>This is a friendly reminder that it's time for your HVAC system maintenance.</p>
           <p>Please schedule a cleaning soon.</p>
           <p>– Your HVAC Company</p>`
  };
}

// Check Firestore daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Checking Firestore for reminders...');
  const snapshot = await db.collection('customers').get();
  const today = new Date();

  snapshot.forEach(async doc => {
    const { name, email, lastService } = doc.data();
    const lastDate = new Date(lastService);
    const oneYear = new Date(lastDate);
    oneYear.setFullYear(lastDate.getFullYear() + 1);

    const sixMonth = new Date(lastDate);
    sixMonth.setMonth(lastDate.getMonth() + 6);

    const oneWeekBefore = new Date(oneYear);
    oneWeekBefore.setDate(oneYear.getDate() - 7);

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (isSameDay(today, sixMonth) || isSameDay(today, oneWeekBefore)) {
      const emailData = generateEmail(name);
      emailData.to = email;
      try {
        const result = await resend.emails.send(emailData);
        console.log(`✅ Email sent to ${email}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${email}:`, err.message);
      }
    }
  });
});

// Optional: allow checking via browser
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('HVAC Reminder Server is running.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
