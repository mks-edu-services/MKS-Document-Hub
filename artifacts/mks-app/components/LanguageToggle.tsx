import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "my" ? "en" : "my";
  const nextLabel = nextLanguage === "my" ? t("burmese") : t("english");

  return (
    <View style={[styles.wrap, compact ? styles.compactWrap : styles.fullWrap]}>
      {!compact ? <Text style={[styles.label, { color: colors.mutedForeground }]}>{t("language")}</Text> : null}
      <TouchableOpacity
        onPress={() => void setLanguage(nextLanguage)}
        style={[
          styles.button,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          compact && {
            paddingHorizontal: 14,
            paddingVertical: 10,
            minWidth: 86,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, { color: colors.foreground }]}>{nextLabel}</Text>
      </TouchableOpacity>
      {!compact ? <Text style={[styles.note, { color: colors.mutedForeground }]}>{t("languageDefaultNote")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  compactWrap: {
    alignItems: "flex-end",
  },
  fullWrap: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
  },
});
