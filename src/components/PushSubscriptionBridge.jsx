import { useEffect } from "react";
import { subscribeToPush, unsubscribeFromPush } from "../data/push";

export default function PushSubscriptionBridge({ userId, enabled }) {
  useEffect(() => {
    if (!userId) return;
    if (enabled) {
      subscribeToPush(userId).catch((error) => {
        console.error("Push subscription failed:", error);
      });
    } else {
      unsubscribeFromPush(userId).catch((error) => {
        console.error("Push unsubscribe failed:", error);
      });
    }
  }, [userId, enabled]);

  return null;
}
