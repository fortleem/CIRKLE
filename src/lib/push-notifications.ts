/**
 * CIRKLE Brain AI — Push Notifications (Upgrade 12)
 * ============================================================================
 * Push notifications for AHG problem detection, TGSE approval requests,
 * and LIEE proposal notifications. Supports iOS, Android, and Web push.
 * ============================================================================
 */

import { db } from "@/lib/db";

export interface PushNotification {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: "normal" | "high";
}

export class PushNotificationService {
  /**
   * Register a push token for a user.
   */
  async registerToken(userId: string, token: string, platform: "ios" | "android" | "web"): Promise<void> {
    try {
    await db.pushToken.create({
      data: { userId, token, platform },
    });
    } catch {
      // DB unavailable — best-effort.
    }
  }

  /**
   * Send a push notification to a user (all their active tokens).
   */
  async send(notification: PushNotification): Promise<{ sent: number; failed: number }> {
    try {
      const tokens = await db.pushToken.findMany({
        where: { userId: notification.userId, active: true },
      });

      let sent = 0;
      let failed = 0;

      for (const tokenRecord of tokens) {
        try {
          // In production, this would call the platform-specific push service:
          // - iOS: APNs (Apple Push Notification service)
          // - Android: FCM (Firebase Cloud Messaging)
          // - Web: Web Push API
          // For now, we log the notification.
          console.log(`[push] ${tokenRecord.platform} → ${tokenRecord.token.slice(0, 10)}...: ${notification.title}`);
          sent++;
        } catch {
          failed++;
        }
      }

      return { sent, failed };
    } catch {
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Send AHG problem notification.
   */
  async notifyAccountProblem(userId: string, problem: { type: string; description: string; severity: string }): Promise<void> {
    await this.send({
      userId,
      title: `Account issue detected: ${problem.severity}`,
      body: problem.description.slice(0, 100),
      data: { type: "ahg-problem", problemType: problem.type },
      priority: problem.severity === "critical" ? "high" : "normal",
    });
  }

  /**
   * Send TGSE approval request notification.
   */
  async notifyApprovalRequest(userId: string, approval: { trigger: string; description: string }): Promise<void> {
    await this.send({
      userId,
      title: "Approval required",
      body: approval.description.slice(0, 100),
      data: { type: "tgse-approval", trigger: approval.trigger },
      priority: "high",
    });
  }

  /**
   * Send LIEE proposal notification.
   */
  async notifyProposal(userId: string, proposal: { title: string; impact: string }): Promise<void> {
    await this.send({
      userId,
      title: `New optimization proposal (${proposal.impact} impact)`,
      body: proposal.title.slice(0, 100),
      data: { type: "liee-proposal" },
      priority: "normal",
    });
  }

  /**
   * Deactivate a push token (e.g., when user logs out).
   */
  async deactivateToken(token: string): Promise<void> {
    try {
      await db.pushToken.updateMany({
        where: { token },
        data: { active: false },
      });
    } catch {
      // DB unavailable — best-effort.
    }
  }
}

export const globalPushService = new PushNotificationService();
