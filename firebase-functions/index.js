const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { defineString } = require('firebase-functions/params');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

initializeApp();
const db = getFirestore();
const adminUid = defineString('ADMIN_UID');
const adminPanelUrl = defineString('ADMIN_PANEL_URL');

exports.registerAdminPushToken = onCall({ region: 'europe-west1' }, async (request) => {
  if (!request.auth || request.auth.uid !== adminUid.value()) {
    throw new HttpsError('permission-denied', 'Only the configured administrator can register push devices.');
  }

  const token = request.data && request.data.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpsError('invalid-argument', 'A valid FCM registration token is required.');
  }

  await db.collection('adminPushTokens').doc(request.auth.uid).set({
    tokens: FieldValue.arrayUnion(token),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { registered: true };
});

exports.notifyAdminOnNewBooking = onDocumentCreated({
  document: 'bookings/{bookingId}',
  region: 'europe-west1'
}, async (event) => {
  const booking = event.data && event.data.data();
  if (!booking) return;

  const tokenDoc = await db.collection('adminPushTokens').doc(adminUid.value()).get();
  const tokenEntries = [];
  if (tokenDoc.exists) {
    (tokenDoc.data().tokens || []).forEach((token) => tokenEntries.push({ uid: tokenDoc.id, token }));
  }
  if (tokenEntries.length === 0) return;

  const title = 'DUE FRATELLI — Nuova prenotazione';
  const body = `${booking.name || 'Nuovo cliente'} · ${booking.date || ''} ${booking.time || ''}`;
  for (let start = 0; start < tokenEntries.length; start += 500) {
    const batch = tokenEntries.slice(start, start + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: batch.map((entry) => entry.token),
      notification: { title, body },
      webpush: {
        fcmOptions: { link: adminPanelUrl.value() }
      }
    });

    const removals = new Map();
    result.responses.forEach((response, index) => {
      if (!response.success && [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token'
      ].includes(response.error && response.error.code)) {
        const entry = batch[index];
        if (!removals.has(entry.uid)) removals.set(entry.uid, []);
        removals.get(entry.uid).push(entry.token);
      }
    });
    await Promise.all([...removals].map(([uid, tokens]) =>
      db.collection('adminPushTokens').doc(uid).update({ tokens: FieldValue.arrayRemove(...tokens) })
    ));
  }
});
