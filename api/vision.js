import { api } from "./client";

export function lookupImage(photoUri) {
  const fd = new FormData();
  const filename = photoUri.split("/").pop() || "photo.jpg";
  fd.append("file", { uri: photoUri, name: filename, type: "image/jpeg" });
  return api("/api/vision/lookup", {
    method: "POST",
    formData: fd,
  });
}
