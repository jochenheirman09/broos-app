
"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowDownToLine } from 'lucide-react';

export function PwaUpdateListener() {
  const { toast, dismiss } = useToast();
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // This event is fired when a new service worker is installed and waiting.
    const onUpdate = (event: Event) => {
      const registration = event.target as ServiceWorkerRegistration;
      setShowReload(true);
      setWaitingWorker(registration.waiting);
    };

    // This checks if there's already a waiting worker on load.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      const wb = window.workbox;
      
      // Add a listener for when a new service worker is waiting.
      wb.addEventListener('waiting', onUpdate);

      // If there's already a waiting worker, show the reload prompt.
      if (wb.waiting) {
        setShowReload(true);
        setWaitingWorker(wb.waiting);
      }
    }
  }, []);

  useEffect(() => {
    if (showReload) {
      const { id } = toast({
        duration: Infinity, // Keep the toast visible until dismissed
        title: "Update Beschikbaar",
        description: "Een nieuwe versie van Broos 2.0 is klaar om geïnstalleerd te worden.",
        action: (
          <Button onClick={() => {
            // Send a message to the waiting service worker to activate it.
            waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
            setShowReload(false);
            dismiss(id);
            // The 'controllerchange' event will fire, and we can reload the page.
          }}>
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Updaten
          </Button>
        ),
      });
    }
  }, [showReload, waitingWorker, toast, dismiss]);

  useEffect(() => {
    // This event fires when the new service worker has taken control.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const onControllerChange = () => {
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }
  }, []);

  return null;
}
