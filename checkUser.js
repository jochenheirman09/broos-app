// checkUser.js
const admin = require('firebase-admin');
const serviceAccount = require('C:/Users/jheir/Documents/broosv2_NEW/serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

admin.auth().getUser('sPMqxc2bXAWMDuaW03DlVpss2Ol2') // De UID uit je log
  .then((userRecord) => {
    console.log('Huidige claims op de SERVER:', userRecord.customClaims);
  });