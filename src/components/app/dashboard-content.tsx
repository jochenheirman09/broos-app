
"use client";

import { useEffect } from "react";
import { useUser } from "@/context/user-context";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { getMessaging, getToken } from "firebase/messaging";
import { useFirebaseApp, useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";


export function DashboardContent() {
  const { userProfile } = useUser();
  const app = useFirebaseApp();
  const db = useFirestore();

  useEffect(() => {
    const autoRefreshToken = async () => {
      // 1. Wait for user profile and ensure we are in a browser
      if (!userProfile?.uid || typeof window === 'undefined') return;

      // 2. IMPORTANT: Wait for the Service Worker to be ready
      // This is the step most "auto" triggers miss!
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // 3. Small delay (500ms) to ensure everything is stable
          setTimeout(async () => {
            try {
              const messaging = getMessaging(app);
              // Check if permission is already granted
              if (Notification.permission === 'granted') {
                const currentToken = await getToken(messaging, { 
                  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
                });

                if (currentToken) {
                  // Same logic as your button
                  const tokenRef = doc(db, 'users', userProfile.uid, 'fcmTokens', currentToken);
                  await setDoc(tokenRef, {
                    token: currentToken,
                    lastUpdated: serverTimestamp(),
                    platform: 'web',
                    autoUpdated: true // Tag it so you know the trigger worked
                  }, { merge: true });
                  
                  console.log("FCM Token auto-refreshed successfully");
                }
              } else if (Notification.permission === 'default') {
                // If they haven't been asked yet, this is where you'd trigger the prompt
                console.log("Permission not granted yet, waiting for user gesture.");
              }
            } catch (tokenErr) {
              console.error("Token retrieval failed:", tokenErr);
            }
          }, 500); 

        } catch (swErr) {
          console.error("Service Worker not ready:", swErr);
        }
      }
    };

    autoRefreshToken();
  }, [userProfile?.uid, app, db]);

  if (!userProfile) {
    return null;
  }

  const { role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      <WelcomeHeader />
      
      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
