import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Shrinks a camera photo before sending it to Gemini.
 * Full-resolution photos are several MB; recognition only needs ~1000px,
 * so this cuts the upload size (and the wait on mobile data) dramatically.
 * Returns the resized JPEG as base64.
 */
export async function prepareScanImage(uri: string, maxWidth: number = 1024): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
  );
  if (!result.base64) {
    throw new Error('prepareScanImage: no base64 returned');
  }
  return result.base64;
}
