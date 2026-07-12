import { api } from "./client";

export function listStores() {
  return api("/api/stores");
}

export function createStore(store_name) {
  return api("/api/stores", {
    method: "POST",
    body: { store_name },
  });
}
