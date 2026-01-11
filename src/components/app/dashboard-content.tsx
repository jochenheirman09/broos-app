"use client";

import { useEffect } from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/user-context";
import { useFirebaseApp } from "@/firebase";
import { getMessaging, getToken } from "firebase/messaging";

export function DashboardContent() {
  const { userProfile, loading: isProfileLoading } = useUser();
  const app = useFirebaseApp();

  // The robust diagnostic function to force SW registration
  const runPushSetup = async () => {
    console.log("🟢 START: runPushSetup (External File Mode)");

    try {
      const messaging = getMessaging(app);
      console.log("1. Unregistering existing workers to be sure...");
      const registrations = await navigator.serviceWorker.getRegistrations();
      for(let registration of registrations) {
        await registration.unregister();
        console.log(`Unregistered SW: ${registration.scope}`);
      }

      console.log("2. Registering /firebase-messaging-sw.js...");
      // Add a timestamp to bypass cache and set the scope to the root
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js?t=' + Date.now(), {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log("✓ SW Geregistreerd!", reg.scope);

      console.log("3. Wachten op activatie...");
      await navigator.serviceWorker.ready;
      console.log("✓ SW is ready!");

      console.log("4. Requesting Permission...");
      const permission = await Notification.requestPermission();
      console.log("🔔 Permissie:", permission);

      if (permission === 'granted') {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        console.log(`🔑 VAPID KEY CHECK: ${vapidKey ? "Aanwezig" : "ONTBREEKT"}`);
        
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: reg
        });
        
        if (token) {
          console.log("✅ TOKEN:", token);
          alert("Token ontvangen! Zie de console voor de waarde.");
        } else {
          console.log("⚠️ getToken() gaf geen token terug.");
        }
      }
    } catch (err: any) {
      console.error("🔥 SETUP FAILED:", err);
      alert("Fout tijdens setup: " + err.message);
    }
  };

  if (isProfileLoading || !userProfile) {
     return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      <WelcomeHeader />
      
      {/* THIS IS THE DEBUGGING BUTTON YOU REQUESTED */}
      <button 
        onClick={() => runPushSetup()}
        className="p-4 bg-blue-500 text-white rounded shadow-lg w-full font-bold"
      >
        Forceer Notificatie Setup (Debug Knop)
      </button>

      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
