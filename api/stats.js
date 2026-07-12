import { api } from "./client";

export function getStats(storeId) {
  return api(`/api/transactions/stats/${storeId}`);
}
