import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function SetupBanner() {
  const colors = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
      <Feather name="alert-triangle" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        Firebase not configured. Add EXPO_PUBLIC_FIREBASE_* environment variables to enable full functionality.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
