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

  async sendNewOrderNotification(tokens: string[], orderNumber: string, orderId: string) {
    if (tokens.length === 0) return;

    const messaging = getMessaging();
    const promises = tokens.map((token) =>
      messaging
        .send({
          token,
          notification: {
            title: '🛵 Yakınında Sipariş Var!',
            body: 'Yeni bir sipariş teklifi geldi. Detayları görmek için dokun.',
          },
          data: {
            orderId,
            orderNumber: String(orderNumber),
            type: 'new_order_offer',
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'orders',
            },
          },
        })
        .catch((err) => console.error('Bildirim gönderilemedi:', err)),
    );
    await Promise.all(promises);
  }
}
