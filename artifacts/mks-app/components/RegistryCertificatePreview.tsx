import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getRegistryFieldLabel } from "@/lib/registry";
import type { FieldType, LanguageCode } from "@/types";

type RegistryField = {
  id: string;
  label?: string;
  labelMy?: string;
  labelEn?: string;
  type: FieldType;
};

type Props = {
  title: string;
  fields: readonly RegistryField[];
  values: Record<string, string>;
  thumbnailUrl?: string;
  fullImageUrl?: string;
  downloadUrl?: string;
  previewPageUrl?: string;
  onPressThumbnail?: () => void;
  language?: LanguageCode;
};

export function RegistryCertificatePreview({
  title,
  fields,
  values,
  thumbnailUrl,
  fullImageUrl,
  downloadUrl,
  previewPageUrl,
  onPressThumbnail,
  language,
}: Props) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { language: contextLanguage } = useLanguage();
  const activeLanguage = language ?? contextLanguage;
  const compact = width < 720;
  const [imageSource, setImageSource] = useState(
    thumbnailUrl || fullImageUrl || "",
  );
  const canEmbedPreview =
    Platform.OS === "web" &&
    Boolean(previewPageUrl) &&
    !previewPageUrl?.includes("drive.google.com");
  const previewUnavailableLabel =
    activeLanguage === "en" ? "Preview unavailable" : "အစမ်းကြည့်မရသေးပါ";
  const previewActionLabel =
    activeLanguage === "en"
      ? fullImageUrl
        ? "Tap to open the file"
        : "Preview unavailable"
      : fullImageUrl
        ? "ဖိုင်ကိုဖွင့်ကြည့်ရန်နှိပ်ပါ"
        : "အစမ်းကြည့်မရသေးပါ";
  const previewSource =
    previewPageUrl || fullImageUrl || thumbnailUrl || "";

  useEffect(() => {
    setImageSource(thumbnailUrl || fullImageUrl || "");
  }, [fullImageUrl, thumbnailUrl]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <View style={[styles.sheet, compact && styles.sheetCompact]}>
        <View style={styles.rowsColumn}>
          {fields.map((field) => {
            const label = getRegistryFieldLabel(field.id, activeLanguage, {
              label: field.label ?? "",
              labelMy: field.labelMy,
              labelEn: field.labelEn,
            });
            const value = values[field.id] ?? "";
            return (
              <View key={field.id} style={styles.row}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {label}
                </Text>
                <View
                  style={[
                    styles.valueBox,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[styles.valueText, { color: colors.foreground }]}
                    numberOfLines={field.type === "textarea" ? 3 : 1}
                  >
                    {value ? value : " "}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[styles.thumbColumn, compact && styles.thumbColumnCompact]}
        >
          {canEmbedPreview && previewSource ? (
            <View
              style={[
                styles.thumbFrame,
                { borderColor: colors.border, backgroundColor: colors.muted },
              ]}
            >
              {React.createElement("iframe" as any, {
                src: previewSource,
                title: title || "Drive preview",
                style: {
                  width: "100%",
                  height: "100%",
                  border: 0,
                  borderRadius: 8,
                  backgroundColor: colors.card,
                },
                allow: "fullscreen",
                loading: "lazy",
              })}
            </View>
          ) : (
            <Pressable
              onPress={() => {
                if (onPressThumbnail) {
                  onPressThumbnail();
                  return;
                }
                if (previewSource) {
                  Linking.openURL(previewSource);
                }
              }}
              disabled={!onPressThumbnail && !previewSource}
              style={[
                styles.thumbFrame,
                { borderColor: colors.border, backgroundColor: colors.muted },
              ]}
            >
              {imageSource ? (
                <Image
                  source={{ uri: imageSource }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                  onError={() => {
                    if (imageSource !== fullImageUrl && fullImageUrl) {
                      setImageSource(fullImageUrl);
                      return;
                    }
                    setImageSource("");
                  }}
                />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Text
                    style={[
                      styles.thumbPlaceholderText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {previewActionLabel || previewUnavailableLabel}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          {downloadUrl ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => Linking.openURL(downloadUrl)}
              style={[
                styles.downloadBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={styles.downloadBtnText}>
                {activeLanguage === "en" ? "Download" : "ဒေါင်းလုပ်"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.thumbHint, { color: colors.mutedForeground }]}>
            Tap the thumbnail to view full image
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  title: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  sheet: { flexDirection: "row", gap: 14, alignItems: "stretch" },
  sheetCompact: { flexDirection: "column" },
  rowsColumn: { flex: 1, gap: 8, minWidth: 0 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  label: { width: 104, fontSize: 13, fontWeight: "600" },
  valueBox: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
  valueText: { fontSize: 13, fontWeight: "500" },
  thumbColumn: { flex: 1, minWidth: 280, gap: 10, alignItems: "stretch" },
  thumbColumnCompact: { width: "100%" },
  thumbFrame: {
    width: "100%",
    flex: 1,
    minHeight: 320,
    aspectRatio: 0.78,
    borderWidth: 1,
    padding: 6,
  },
  thumbImage: { width: "100%", height: "100%", borderRadius: 8 },
  downloadBtn: {
    alignSelf: "stretch",
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  downloadBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbPlaceholderText: { fontSize: 13, fontWeight: "700" },
  thumbHint: { fontSize: 11, textAlign: "center" },
});
