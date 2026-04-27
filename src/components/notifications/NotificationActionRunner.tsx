import { useNotificationActionHandler } from "@/hooks/useNotificationActionHandler";

/**
 * Mounted once inside the router so service-worker action deep-links
 * (?action=complete&task_id=…) are processed on every authenticated page.
 * Renders nothing.
 */
export function NotificationActionRunner() {
  useNotificationActionHandler();
  return null;
}