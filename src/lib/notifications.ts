import { db } from "@/lib/db";

/**
 * Fire-and-forget notification creation.
 * Used by other API routes to emit notifications without awaiting.
 */
export async function createNotification(data: {
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type ?? "info",
        link: data.link ?? null,
      },
    });
  } catch (err) {
    // Silent — notifications should never break the caller
    console.error("Failed to create notification:", err);
  }
}