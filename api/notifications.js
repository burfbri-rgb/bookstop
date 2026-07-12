import { api } from "./client";

export function registerPushToken(pushToken) {
  return api("/api/notifications/register", {
    method: "POST",
    body: { push_token: pushToken },
  });
}
