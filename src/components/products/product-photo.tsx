import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { fa } from '@/i18n';
import { resolveProductPhotoUri } from '@/lib/product-photos';
import { useTheme } from '@/hooks/use-theme';

export function ProductPhoto({
  photoUri,
  size = 72,
  placeholderText,
  circle = false,
}: {
  photoUri: string | null;
  size?: number;
  placeholderText?: string;
  circle?: boolean;
}) {
  const theme = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const source = resolveProductPhotoUri(photoUri);

  if (source && failedUri !== photoUri) {
    return (
      <Image
        source={{ uri: source }}
        contentFit="cover"
        onError={() => setFailedUri(photoUri)}
        style={[
          styles.photo,
          {
            width: size,
            height: size,
            borderRadius: circle ? size / 2 : Radius.md,
          },
        ]}
      />
    );
  }

  return (
    <View
      accessibilityLabel={placeholderText ?? fa.productPhoto.placeholder}
      style={[
        styles.placeholder,
        circle && { borderRadius: size / 2 },
        {
          width: size,
          height: size,
          backgroundColor: placeholderText ? theme.primarySoft : theme.surfaceMuted,
          borderColor: placeholderText ? theme.primary : theme.border,
        },
      ]}
    >
      {placeholderText ? (
        <ThemedText
          type="number"
          style={[
            styles.initial,
            { color: theme.primary, fontSize: size * 0.42, lineHeight: size * 0.5 },
          ]}>
          {placeholderText}
        </ThemedText>
      ) : (
        <>
          <Icon name={Icons.inventory} size={Math.min(size * 0.38, 34)} color={theme.textSecondary} />
          {size >= 110 ? (
            <ThemedText
              type="caption"
              themeColor="textSecondary"
              style={styles.placeholderText}>
              {fa.productPhoto.placeholder}
            </ThemedText>
          ) : null}
        </>
      )}
    </View>
  );
}

export function ProductPhotoField({
  value,
  onChange,
  disabled = false,
  title = fa.productPhoto.title,
  placeholderText,
  circle = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  title?: string;
  placeholderText?: string;
  circle?: boolean;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPhoto = async (source: 'camera' | 'library') => {
    if (busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          source === 'camera'
            ? fa.productPhoto.cameraPermission
            : fa.productPhoto.libraryPermission
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: Platform.OS === 'web',
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) throw new Error(fa.productPhoto.selectionFailed);
      const photoUri = Platform.OS === 'web' && asset.base64
        ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      onChange(photoUri);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fa.productPhoto.selectionFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.preview}>
        <ProductPhoto
          photoUri={value}
          size={168}
          placeholderText={placeholderText}
          circle={circle}
        />
      </View>
      <View style={styles.actions}>
        <AppButton
          label={fa.productPhoto.takePhoto}
          variant="secondary"
          size="small"
          icon={<Icon name={Icons.camera} size={18} color={theme.primary} />}
          onPress={() => void selectPhoto('camera')}
          loading={busy}
          disabled={disabled}
          style={styles.action}
        />
        <AppButton
          label={fa.productPhoto.choosePhoto}
          variant="secondary"
          size="small"
          icon={<Icon name={Icons.photoLibrary} size={18} color={theme.primary} />}
          onPress={() => void selectPhoto('library')}
          loading={busy}
          disabled={disabled}
          style={styles.action}
        />
      </View>
      {value ? (
        <AppButton
          label={fa.productPhoto.removePhoto}
          variant="ghost"
          size="small"
          onPress={() => onChange(null)}
          disabled={busy || disabled}
        />
      ) : null}
      {error ? (
        <ThemedText type="caption" style={{ color: theme.danger }}>{error}</ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  photo: {
    borderRadius: Radius.md,
    backgroundColor: '#E4E7EC',
  },
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.two,
  },
  placeholderText: {
    textAlign: 'center',
  },
  initial: {
    fontWeight: '700',
    textAlign: 'center',
  },
  preview: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
