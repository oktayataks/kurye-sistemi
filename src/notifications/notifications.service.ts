import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async sendNewOrderNotification(tokens: string[], orderNumber: string) {
    if (tokens.length === 0) return;

    const promises = tokens.map((token) =>
      admin
        .messaging()
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
