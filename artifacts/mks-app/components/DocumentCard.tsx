import { Feather, MaterialIcons } from "@/components/AppIcons";
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { Document, DocumentStatus } from '@/types';
import { getRegistryDisplayTitle, localizeDigits } from "@/lib/registry";

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  serialNumber?: number;
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

export function DocumentCard({ document, onPress, serialNumber }: DocumentCardProps) {
  const colors = useColors();
  const { formatDate, translateServiceType, translateStatus, t, language } = useLanguage();
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const status = statusConfig[document.status] || statusConfig.active;
  const iconName = serviceIcons[document.serviceType] || serviceIcons.Default;
  const displayTitle = getRegistryDisplayTitle(document, language);
  const displaySubtitle = document.fatherName || document.studentName;

  const dateStr = document.date
    ? formatDate(document.date, { day: 'numeric', month: 'short', year: 'numeric' })
    : document.createdAt
    ? formatDate(document.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const updatedStr = document.updatedAt
    ? formatDate(document.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const showUpdated = Boolean(updatedStr && updatedStr !== dateStr);
  const driveState = document.driveSyncStatus ?? (document.driveFileUrl ? 'synced' : 'pending');
  const driveText =
    driveState === 'synced'
      ? t("driveSynced")
      : driveState === 'failed'
      ? t("driveFailed")
      : t("drivePending");
  const driveColor =
    driveState === 'synced'
      ? colors.success
      : driveState === 'failed'
      ? colors.destructive
      : colors.warning;

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
        {serialNumber ? (
          <View style={[styles.serialWrap, { backgroundColor: colors.navyLight }]}>
            <Text style={[styles.serialText, { color: colors.primary }]}>
              {t("serial")} {localizeDigits(serialNumber, language)}
            </Text>
          </View>
        ) : null}
        <View style={[styles.topRow, isCompact && styles.topRowCompact]}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={isCompact ? 2 : 1}>
            {displayTitle}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{translateStatus(document.status)}</Text>
          </View>
        </View>
        <Text style={[styles.studentName, { color: colors.accent }]} numberOfLines={isCompact ? 2 : 1}>
          {displaySubtitle}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="book-open" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{document.school || t("school")}</Text>
          </View>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{translateServiceType(document.serviceType)}</Text>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{dateStr}</Text>
          {showUpdated ? (
            <>
              <View style={styles.metaDot} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{`${t("lastUpdated")} ${updatedStr}`}</Text>
            </>
          ) : null}
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: driveColor }]}>
            {driveText}
          </Text>
          {document.scanFileName ? (
            <>
              <View style={styles.metaDot} />
              <Text style={[styles.metaText, { color: colors.accent }]}>{t("scanLinked")}</Text>
            </>
          ) : null}
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
  serialWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  serialText: {
    fontSize: 11,
    fontWeight: "700",
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRowCompact: { alignItems: "flex-start" },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
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
