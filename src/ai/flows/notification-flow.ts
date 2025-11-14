
'use server';
/**
 * @fileOverview A flow to send a push notification to a user.
 */

import { type NotificationInput } from '@/ai/types';
import { notificationFlow } from './notification-flow-internal';


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    return notificationFlow(input);
}
