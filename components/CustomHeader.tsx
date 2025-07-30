import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { UserAvatar } from './UserAvatar';

interface CustomHeaderProps {
  title: string;
  showAvatar?: boolean;
  onAvatarPress?: () => void;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({ 
  title, 
  showAvatar = true,
  onAvatarPress 
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {showAvatar && (
          <View style={styles.avatarContainer}>
            <UserAvatar 
              size={32} 
              onPress={onAvatarPress || (() => navigation.navigate('Profile' as never))}
              showBorder={false}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  avatarContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    zIndex: 2,
  },
}); 