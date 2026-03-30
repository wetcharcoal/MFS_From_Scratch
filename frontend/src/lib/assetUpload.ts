import type { ActorSubclass } from "@icp-sdk/core/agent";
import { sha256 } from "@noble/hashes/sha256";
import type { _SERVICE } from "@/declarations/aseed_backend.did";

const MAX_PROFILE_IMAGE_BYTES = 300 * 1024;

/** Predictable folder per group; file is profile.{ext} */
export function profileAssetFolder(groupId: string): string {
  return `groups/${groupId}`;
}

export function profileImagePublicUrl(storedPath: string): string {
  const path = storedPath.replace(/^\/+/, "");
  const cid = import.meta.env.VITE_CANISTER_ID_ASEED_FRONTEND;
  if (!cid) return "";
  const net = import.meta.env.VITE_DFX_NETWORK || "local";
  if (net === "ic") {
    return `https://${cid}.icp0.io/${path}`;
  }
  return `http://${cid}.localhost:4943/${path}`;
}

function extensionForFile(file: File): string {
  if (file.name.includes(".")) {
    return file.name.slice(file.name.lastIndexOf("."));
  }
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  return ".jpg";
}

/**
 * Upload profile image bytes via the backend canister (which must be a controller of the asset canister).
 * End-user principals do not get Commit on the asset canister; the backend calls `store` as the controller.
 */
export async function uploadGroupProfilePicture(
  actor: ActorSubclass<_SERVICE> | null,
  groupId: string,
  file: File
): Promise<string> {
  if (!actor) {
    throw new Error("Sign in to upload a profile image.");
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Image must be 300 KB or smaller.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  // #region agent log
  fetch("http://127.0.0.1:7721/ingest/5bae6d62-c6de-407d-9b50-edaadf1c612f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "34fc11" },
    body: JSON.stringify({
      sessionId: "34fc11",
      location: "assetUpload.ts:uploadGroupProfilePicture",
      message: "store via backend store_group_profile_asset",
      data: { groupIdPrefix: groupId.slice(0, 8) },
      timestamp: Date.now(),
      hypothesisId: "H-commit-via-backend",
      runId: "post-commit-proxy",
    }),
  }).catch(() => {});
  // #endregion

  const ext = extensionForFile(file);
  const fileName = `profile${ext}`;
  const path = `/${profileAssetFolder(groupId)}/`;
  const key = [path, fileName].join("/");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = sha256.create().update(bytes).digest();
  const res = await actor.store_group_profile_asset(
    groupId,
    key,
    bytes,
    file.type || "application/octet-stream",
    Array.from(hash)
  );
  if ("err" in res) {
    throw new Error(res.err);
  }
  // #region agent log
  fetch("http://127.0.0.1:7721/ingest/5bae6d62-c6de-407d-9b50-edaadf1c612f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "34fc11" },
    body: JSON.stringify({
      sessionId: "34fc11",
      location: "assetUpload.ts:afterBackendStore",
      message: "backend asset store ok",
      data: { returnedKeyPrefix: res.ok.slice(0, 32) },
      timestamp: Date.now(),
      hypothesisId: "H-commit-via-backend",
      runId: "post-commit-proxy",
    }),
  }).catch(() => {});
  // #endregion

  return res.ok;
}

/** Delete profile asset via backend (same permission model as upload). */
export async function deleteGroupProfilePicture(
  actor: ActorSubclass<_SERVICE> | null,
  storedPath: string
): Promise<void> {
  if (!actor) return;
  const res = await actor.delete_group_profile_asset(storedPath);
  if ("err" in res) {
    throw new Error(res.err);
  }
}
