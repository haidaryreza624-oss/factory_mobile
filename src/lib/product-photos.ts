import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const PRODUCT_PHOTO_PREFIX = 'factory-product-photo-';

export async function persistProductPhoto(uri: string): Promise<string> {
  if (uri.startsWith('data:image/') || uri.startsWith(PRODUCT_PHOTO_PREFIX)) {
    return uri;
  }
  if (Platform.OS === 'web') {
    throw new Error('ذخیره عکس در این مرورگر پشتیبانی نمی‌شود.');
  }

  const cleanUri = uri.split(/[?#]/, 1)[0];
  const extension = cleanUri.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  const supportedExtension = extension && [
    'avif',
    'heic',
    'jpeg',
    'jpg',
    'png',
    'webp',
  ].includes(extension)
    ? extension
    : 'jpg';
  const filename = `${PRODUCT_PHOTO_PREFIX}${randomUUID()}.${supportedExtension}`;
  await new File(uri).copy(new File(Paths.document, filename));
  return filename;
}

export function resolveProductPhotoUri(reference: string | null): string | null {
  if (!reference) return null;
  if (/^(data:image\/|file:\/\/|https?:\/\/|blob:)/i.test(reference)) {
    return reference;
  }
  if (Platform.OS === 'web') return null;
  return new File(Paths.document, reference).uri;
}

export function deleteStoredProductPhoto(reference: string | null): void {
  if (
    !reference ||
    !reference.startsWith(PRODUCT_PHOTO_PREFIX) ||
    Platform.OS === 'web'
  ) {
    return;
  }

  const file = new File(Paths.document, reference);
  if (file.exists) file.delete();
}
