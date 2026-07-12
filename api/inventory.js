import { api } from "./client";

export function listInventory(storeId) {
  return api(`/api/inventory?store_id=${storeId}`);
}

export function createInventory(storeId, price, stockCount, barcode, imageUrl) {
  return api("/api/inventory", {
    method: "POST",
    body: { store_id: storeId, price, stock_count: stockCount, barcode_isbn: barcode, clean_image_url: imageUrl },
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

export function processImage(imageUri) {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "photo.jpg";
  formData.append("image", { uri: imageUri, name: filename, type: "image/jpeg" });
  return api("/api/inventory/process-image", {
    method: "POST",
    formData,
  });
}
