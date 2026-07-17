import { api, uploadFile } from "./client";

export async function sale(storeId, itemId, receiptUri) {
  const extra = { store_id: storeId, item_id: itemId };
  if (receiptUri) {
    return uploadFile("/api/transactions/sale", receiptUri, "receipt_image", extra);
  }
  return api("/api/transactions/sale", {
    method: "POST",
    body: extra,
  });
}

export async function batchSale(storeId, items, receiptUri) {
  const extra = { store_id: storeId, items: JSON.stringify(items) };
  if (receiptUri) {
    return uploadFile("/api/transactions/batch-sale", receiptUri, "receipt_image", extra);
  }
  return api("/api/transactions/batch-sale", {
    method: "POST",
    body: extra,
  });
}

export function exportCsv(storeId) {
  return api(`/api/transactions/export/${storeId}`);
}
