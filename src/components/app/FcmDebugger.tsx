'use client';
import { getMessaging, getToken } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useUser } from '@/context/user-context';

export default function FcmDebugger() {
  const app = useFirebaseApp();
  const { user } = useUser();

  const startTest = async () => {
    alert("Stap 1: Test gestart");
    if (!user) {
        alert("Fout: Geen gebruiker ingelogd.");
        return;
    }
    const userId = user.uid;
    
    try {
      if (!('serviceWorker' in navigator)) {
        alert("Fout: Browser ondersteunt geen Service Workers");
        return;
      }

      alert("Stap 2: Rechten opvragen...");
      const permission = await Notification.requestPermission();
      alert("Rechten status: " + permission);

      if (permission !== 'granted') return;

      alert("Stap 3: Service Worker Ready check...");
      const registration = await navigator.serviceWorker.ready;
      alert("SW is ready: " + (registration.active?.state || 'unknown'));

      alert("Stap 4: Token ophalen bij Google...");
      const messaging = getMessaging(app);
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
          alert("Fout: VAPID key ontbreekt in de client-side environment.");
          return;
      }

      const token = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      if (!token) {
        alert("Fout: Geen token gegenereerd");
        return;
      }

      alert("Stap 5: Token naar server sturen: " + token.substring(0, 10) + "...");
      const res = await fetch('/api/save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
            alert("SUCCES! Token staat in de database.");
        } else {
            alert("Server Fout (res.ok but not success): " + JSON.stringify(data));
        }
      } else {
        const errorData = await res.json();
        alert("Server Fout: " + res.status + " " + JSON.stringify(errorData));
      }

    } catch (err: any) {
      alert("CRASH: " + err.message);
      console.error(err);
    }
  };

  return (
    <button 
      onClick={startTest}
      className="p-4 bg-orange-500 text-white font-bold rounded-xl w-full my-4 touch-manipulation"
      style={{ minHeight: '60px', border: '3px solid black' }}
    >
      DEBUG NOTIFICATIES (KLIK HIER)
    </button>
  );
}
