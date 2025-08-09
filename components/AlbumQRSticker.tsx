import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import QRCode from 'qrcode';

interface AlbumQRStickerProps {
  albumId: string;
  title: string;
  artist: string;
  baseUrl?: string; // optional deep link or web URL base
}

// Generates a small printable sticker (50x30 mm) with QR and album text
export const AlbumQRSticker: React.FC<AlbumQRStickerProps> = ({ albumId, title, artist, baseUrl }) => {
  const qrText = useMemo(() => {
    const url = `${baseUrl || 'https://bothside.app/album'}/${albumId}`;
    return url;
  }, [albumId, baseUrl]);

  const onPrint = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 256 });
      const safeTitle = (title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeArtist = (artist || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // Sticker size ~ 50x30mm. 1in = 25.4mm, 300dpi => use CSS mm units.
      const html = `
        <html>
          <head>
            <meta name="viewport" content="initial-scale=1, width=device-width" />
            <style>
              @page { size: 50mm 30mm; margin: 2mm; }
              body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 0; }
              .sticker { width: 100%; height: 100%; display: flex; align-items: center; }
              .qr { width: 24mm; height: 24mm; }
              .info { margin-left: 4mm; display: flex; flex-direction: column; }
              .title { font-size: 10pt; font-weight: 600; line-height: 1.1; }
              .artist { font-size: 8pt; color: #444; line-height: 1.1; }
              .id { font-size: 7pt; color: #666; margin-top: 1mm; }
            </style>
          </head>
          <body>
            <div class="sticker">
              <img class="qr" src="${dataUrl}" />
              <div class="info">
                <div class="title">${safeTitle}</div>
                <div class="artist">${safeArtist}</div>
                <div class="id">#${albumId.slice(0, 8)}</div>
              </div>
            </div>
          </body>
        </html>`;

      await Print.printAsync({ html });
    } catch (e) {
      console.error('Error printing QR sticker:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sticker QR</Text>
      <TouchableOpacity style={styles.button} onPress={onPrint}>
        <Text style={styles.buttonText}>Imprimir</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: '#555' },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: 'white', fontWeight: '600' },
});

export default AlbumQRSticker; 