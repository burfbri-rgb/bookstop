import { api, uploadFile } from "./client";

export function listInventory(storeId) {
  return api(`/api/inventory?store_id=${storeId}`);
}

export function createInventory(storeId, price, stockCount, barcode, imageUrl, title) {
  return api("/api/inventory", {
    method: "POST",
    body: { store_id: storeId, price, stock_count: stockCount, barcode_isbn: barcode, clean_image_url: imageUrl, title },
  });
}

export function updateInventory(itemId, data) {
  return api(`/api/inventory/${itemId}`, {
    method: "PATCH",
    body: data,
  });
}

export function deleteInventory(itemId) {
  return api(`/api/inventory/${itemId}`, { method: "DELETE" });
}

export function lookupBarcode(storeId, barcode) {
  return api(`/api/inventory/by-barcode/${encodeURIComponent(barcode)}?store_id=${storeId}`);
}

export async function processImage(imageUri) {
  return uploadFile("/api/inventory/process-image", imageUri, "file");
}
