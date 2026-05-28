import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface MKSLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'icon';
  light?: boolean;
}

export function MKSLogo({ size = 'medium', variant = 'full', light = false }: MKSLogoProps) {
  const colors = useColors();
  const dimensions = { small: 32, medium: 44, large: 64 }[size];
  const textSizes = { small: 14, medium: 18, large: 26 };
  const subSizes = { small: 8, medium: 9, large: 13 };

  const logoColor = light ? '#ffffff' : colors.primary;
  const accentColor = colors.teal;
  const textColor = light ? '#ffffff' : colors.foreground;

  return (
    <View style={styles.container}>
      <View style={[styles.iconBox, { width: dimensions, height: dimensions, borderRadius: dimensions * 0.2, backgroundColor: light ? 'rgba(255,255,255,0.15)' : colors.navyLight }]}>
        <Text style={[styles.iconText, { fontSize: dimensions * 0.42, color: logoColor }]}>M</Text>
        <View style={[styles.accent, { backgroundColor: accentColor, width: dimensions * 0.35, height: 2.5, borderRadius: 2, marginTop: 1 }]} />
      </View>
      {variant === 'full' && (
        <View style={styles.textBox}>
          <Text style={[styles.mainText, { fontSize: textSizes[size], color: logoColor, fontWeight: '800' }]}>MKS</Text>
          <Text style={[styles.subText, { fontSize: subSizes[size], color: light ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>EDUCATION SERVICE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  iconText: {
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: undefined,
  },
  accent: {},
  textBox: {
    justifyContent: 'center',
  },
  mainText: {
    letterSpacing: 2,
    lineHeight: undefined,
  },
  subText: {
    letterSpacing: 1.5,
    lineHeight: undefined,
  },
});
