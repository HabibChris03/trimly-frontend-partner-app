import { API_BASE_URL, getStoredAuthToken } from "./api";

export type UploadPurpose = "logo" | "portfolio" | "review" | "general";

export interface UploadedMedia {
  url: string;
  public_id?: string;
  resource_type?: string;
  format?: string;
  bytes?: number;
  purpose?: string;
}

const LOCAL_URI_PATTERN = /^(file|content|ph|assets-library):\/\//i;
const CLOUDINARY_HOST = "res.cloudinary.com";

function isLocalUri(uri: string): boolean {
  return LOCAL_URI_PATTERN.test(uri);
}

function isCloudinaryUrl(uri: string): boolean {
  return uri.includes(CLOUDINARY_HOST);
}

function isRemoteHttpUrl(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".mp4") || lower.includes(".mp4?")) return "video/mp4";
  if (lower.endsWith(".mov") || lower.includes(".mov?")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function filenameFromUri(uri: string, mimeType: string): string {
  const ext = mimeType.startsWith("video/") ? "mp4" : "jpg";
  const parts = uri.split("/");
  const last = parts[parts.length - 1]?.split("?")[0];
  if (last && last.includes(".")) return last;
  return `upload.${ext}`;
}

/**
 * Upload a local device file to Cloudinary via the backend.
 * Uses XMLHttpRequest instead of fetch() to avoid the
 * "Unsupported FormDataPart implementation" error in Expo SDK 57+.
 */
export async function uploadMediaFile(
  uri: string,
  purpose: UploadPurpose = "general"
): Promise<UploadedMedia> {
  const token = await getStoredAuthToken();
  const mimeType = guessMimeType(uri);
  const filename = filenameFromUri(uri, mimeType);

  return new Promise<UploadedMedia>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/v1/uploads/media`);

    // Set auth header
    xhr.setRequestHeader("Accept", "application/json");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    // Timeout: 25 seconds
    xhr.timeout = 25000;

    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data?.media as UploadedMedia);
      } else {
        const message =
          data?.detail?.message ||
          data?.detail ||
          data?.message ||
          `Upload failed with status ${xhr.status}`;
        reject(new Error(typeof message === "string" ? message : "Upload failed"));
      }
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. Please check your network connection and try again."));
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload. Please try again."));
    };

    // Build FormData — XHR handles the { uri, name, type } object natively in React Native
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
      type: mimeType,
    } as any);
    formData.append("purpose", purpose);

    xhr.send(formData);
  });
}

/**
 * Ensure a media URI is stored in Cloudinary. Local files are uploaded first;
 * existing Cloudinary or remote URLs are returned as-is (backend re-uploads remote URLs)
 */
export async function ensureCloudinaryUrl(
  uri: string | null | undefined,
  purpose: UploadPurpose = "general"
): Promise<string | null | undefined> {
  if (!uri) return uri;
  if (isCloudinaryUrl(uri)) return uri;

  if (isLocalUri(uri)) {
    const uploaded = await uploadMediaFile(uri, purpose);
    return uploaded.url;
  }

  if (isRemoteHttpUrl(uri)) {
    return uri;
  }

  return uri;
}

export const uploadService = {
  uploadMediaFile,
  ensureCloudinaryUrl,
};
