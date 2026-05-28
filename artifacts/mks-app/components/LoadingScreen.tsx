import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { MKSLogo } from './MKSLogo';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <MKSLogo size="large" light />
      <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" style={{ marginTop: 40 }} />
      {message && <Text style={styles.msg}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  msg: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
});
