import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  constructor() {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendNewOrderNotification(tokens: string[], orderNumber: string) {
    if (tokens.length === 0) return;

    const messaging = getMessaging();
    const promises = tokens.map((token) =>
      messaging
        .send({
          token,
          notification: {
            title: '🛵 Yeni Sipariş!',
            body: `#${orderNumber} numaralı sipariş sizi bekliyor!`,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'orders_channel',
              sound: 'default',
            },
          },
        })
        .catch((err) => console.error('Bildirim gönderilemedi:', err)),
    );
    await Promise.all(promises);
  }
}
