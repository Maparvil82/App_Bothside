import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { useTheme } from '@react-navigation/native';

interface ImportDiscogsCardProps {
  onPressInfo: () => void;
  onDismiss: () => void;
}

export const ImportDiscogsCard: React.FC<ImportDiscogsCardProps> = ({
  onPressInfo,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const { colors, dark } = useTheme();

  const themeStyles = {
    cardBackground: dark ? '#1e1b4b' : 'white',
    badgeBackground: dark ? '#312e81' : '#EBE9FE',
    badgeText: dark ? '#c7d2fe' : '#5F39F8',
    descriptionText: dark ? '#a5b4fc' : '#686876',
    chevronColor: dark ? '#a5b4fc' : '#5F39F8',
    closeButtonColor: dark ? '#a5b4fc' : '#B8B8C2',
  };

  return (
    <TouchableOpacity
      style={[styles.cardContainer, { backgroundColor: themeStyles.cardBackground }]}
      onPress={onPressInfo}
      activeOpacity={0.8}
    >
      {/* Botón cerrar */}
      <TouchableOpacity
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <Ionicons name="close" size={18} color={themeStyles.closeButtonColor} />
      </TouchableOpacity>

      <View style={styles.textColumn}>
        <View style={styles.headerRow}>
          <View style={[styles.tagBadge, { backgroundColor: themeStyles.badgeBackground }]}>
            <Text style={[styles.tagText, { color: themeStyles.badgeText }]}>
              {t('import_discogs_card_tag')}
            </Text>
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            {t('import_discogs_card_title')}
          </Text>
        </View>

        <Text style={[styles.description, { color: themeStyles.descriptionText }]}>
          {t('import_discogs_card_description')}
        </Text>
      </View>

      <View style={styles.iconContainer}>
        <Ionicons
          name="chevron-forward"
          size={22}
          color={themeStyles.chevronColor}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    shadowColor: '#5F39F8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    paddingTop: 24,
    paddingBottom: 32,

    // Necesario para posicionar la X
    position: 'relative',
  },

  closeButton: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },

  textColumn: {
    flex: 1,
    paddingRight: 36,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  tagBadge: {
    backgroundColor: '#EBE9FE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },

  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5F39F8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  title: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    color: '#686876',
    lineHeight: 18,
    textAlign: 'left',
  },

  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
});