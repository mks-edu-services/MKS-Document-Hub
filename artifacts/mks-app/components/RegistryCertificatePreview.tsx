import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getRegistryFieldLabel } from "@/lib/registry";
import type { LanguageCode } from "@/types";

type RegistryField = {
  id: string;
  labelMy: string;
  labelEn: string;
  type: "text" | "date" | "number" | "textarea";
};

type Props = {
  title: string;
  fields: readonly RegistryField[];
  values: Record<string, string>;
  thumbnailUrl?: string;
  fullImageUrl?: string;
  onPressThumbnail?: () => void;
  language?: LanguageCode;
};

export function RegistryCertificatePreview({
  title,
  fields,
  values,
  thumbnailUrl,
  fullImageUrl,
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
              label: field.labelEn,
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
          <Pressable
            onPress={onPressThumbnail}
            disabled={!onPressThumbnail && !fullImageUrl}
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
  sheet: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  sheetCompact: { flexDirection: "column" },
  rowsColumn: { flex: 1, gap: 8 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  label: { width: 96, fontSize: 13, fontWeight: "600" },
  valueBox: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
  },
  valueText: { fontSize: 13, fontWeight: "500" },
  thumbColumn: { width: 170, gap: 8, alignItems: "center" },
  thumbColumnCompact: { width: "100%" },
  thumbFrame: { width: "100%", aspectRatio: 0.78, borderWidth: 1, padding: 4 },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbPlaceholderText: { fontSize: 13, fontWeight: "700" },
  thumbHint: { fontSize: 11, textAlign: "center" },
});
