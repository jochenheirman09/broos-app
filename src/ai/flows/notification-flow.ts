'use server';
/**
 * @fileOverview A flow to send a push notification to a user.
 */

import type { NotificationInput } from '@/ai/types';
import { notificationFlow } from './notification-flow-internal'; // <<< NEW IMPORT

export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    return notificationFlow(input);
}
// All flow definition is now in notification-flow-internal.ts