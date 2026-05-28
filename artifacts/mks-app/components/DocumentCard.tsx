import { Feather, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Document, DocumentStatus } from '@/types';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
}

const statusConfig: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#16a34a', bg: '#dcfce7' },
  draft: { label: 'Draft', color: '#d97706', bg: '#fef3c7' },
  archived: { label: 'Archived', color: '#6b7c93', bg: '#f0f4f8' },
};

const serviceIcons: Record<string, string> = {
  'Degree Certificate': 'school',
  'Notary': 'verified',
  'Transcript': 'description',
  'Translation': 'translate',
  'Default': 'insert-drive-file',
};

export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const colors = useColors();
  const status = statusConfig[document.status] || statusConfig.active;
  const iconName = serviceIcons[document.serviceType] || serviceIcons.Default;

  const dateStr = document.date
    ? new Date(document.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : document.createdAt
    ? new Date(document.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.navyLight }]}>
        <MaterialIcons name={iconName as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{document.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.studentName, { color: colors.accent }]} numberOfLines={1}>
          {document.studentName}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="book-open" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{document.school || 'No school'}</Text>
          </View>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{document.serviceType}</Text>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{dateStr}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
