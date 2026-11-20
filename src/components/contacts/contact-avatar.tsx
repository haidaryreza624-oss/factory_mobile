import { ProductPhoto, ProductPhotoField } from '@/components/products/product-photo';
import { fa } from '@/i18n';

function getInitial(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '؟';
}

export function ContactAvatar({
  name,
  photoUri,
  size = 40,
}: {
  name: string;
  photoUri: string | null;
  size?: number;
}) {
  return (
    <ProductPhoto
      photoUri={photoUri}
      size={size}
      placeholderText={getInitial(name)}
      circle
    />
  );
}

export function ContactPhotoField({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <ProductPhotoField
      value={value}
      onChange={onChange}
      disabled={disabled}
      title={fa.contacts.photoTitle}
      placeholderText={getInitial(name)}
      circle
    />
  );
}
