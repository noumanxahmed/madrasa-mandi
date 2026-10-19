import * as FileSystem from "expo-file-system/legacy";

const CLOUD_NAME = "djmskqcsu";
const UPLOAD_PRESET = "mandi_uploads";

/**
 * Uploads a local file URI to Cloudinary via base64 encoding using legacy API.
 * Compatible with Expo SDK 54+.
 */
export async function uploadToCloudinary(localUri) {
  if (!localUri) return null;

  // If already an HTTP/HTTPS remote URL, skip upload
  if (localUri.startsWith("http://") || localUri.startsWith("https://")) {
    return localUri;
  }

  try {
    const base64Data = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const filePayload = `data:image/jpeg;base64,${base64Data}`;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: filePayload,
          upload_preset: UPLOAD_PRESET,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    return data.secure_url;
  } catch (err) {
    console.error("Cloudinary upload failure:", err);
    throw err;
  }
}

export async function uploadMultipleImages(imageUris) {
  if (!imageUris || imageUris.length === 0) return [];
  const uploadPromises = imageUris.map((uri) => uploadToCloudinary(uri));
  return await Promise.all(uploadPromises);
}
