import { api } from "./client";

export function sale(storeId, itemId, receiptUri) {
  const fd = new FormData();
  fd.append("store_id", storeId);
  fd.append("item_id", itemId);
  if (receiptUri) {
    const filename = receiptUri.split("/").pop() || "receipt.jpg";
    fd.append("receipt_image", { uri: receiptUri, name: filename, type: "image/jpeg" });
  }
  return api("/api/transactions/sale", {
    method: "POST",
    formData: fd,
  });
}

export function batchSale(storeId, items, receiptUri) {
  const fd = new FormData();
  fd.append("store_id", storeId);
  fd.append("items", JSON.stringify(items));
  if (receiptUri) {
    const filename = receiptUri.split("/").pop() || "receipt.jpg";
    fd.append("receipt_image", { uri: receiptUri, name: filename, type: "image/jpeg" });
  }
  return api("/api/transactions/batch-sale", {
    method: "POST",
    formData: fd,
  });
}

export function exportCsv(storeId) {
  return api(`/api/transactions/export/${storeId}`);
}
