// set-claim.js
const admin = require('firebase-admin');

// Zorg ervoor dat het 'serviceAccountKey.json' bestand in dezelfde map staat.
// Download dit bestand vanuit de Firebase Console: Project settings > Service accounts > Generate new private key.
try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK geïnitialiseerd.');
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error("❌ FOUT: Het bestand 'serviceAccountKey.json' is niet gevonden.");
    console.error("   Download dit bestand van de Firebase Console en plaats het in de hoofdmap van je project.");
    process.exit(1);
  } else if (e.code === 'app/duplicate-app') {
    console.log('ℹ️  Admin SDK was al geïnitialiseerd.');
  } else {
    console.error('❌ Fout bij initialiseren Admin SDK:', e);
    process.exit(1);
  }
}


// De UID van de gebruiker die de 'responsible' rol moet krijgen.
// Dit is de UID voor de gebruiker jochen.heirman@gmail.com
const uid = 'DKsO1eHpocf8QxwfjQUwcC5UOkm2';
const claimsToSet = { role: 'responsible' };

admin.auth().setCustomUserClaims(uid, claimsToSet)
  .then(() => {
    console.log(`✅ Succesvol de claim ${JSON.stringify(claimsToSet)} ingesteld voor gebruiker ${uid}`);
    console.log('👉 Belangrijk: De gebruiker moet nu uitloggen en opnieuw inloggen in de app om de wijziging door te voeren.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fout bij het instellen van de custom claim:', error);
    process.exit(1);
  });
