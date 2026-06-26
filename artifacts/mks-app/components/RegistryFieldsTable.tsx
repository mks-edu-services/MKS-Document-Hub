import React from "react";
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
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
  onChange?: (fieldId: string, value: string) => void;
  editable?: boolean;
  language?: LanguageCode;
};

export function RegistryFieldsTable({ title, fields, values, onChange, editable = false, language }: Props) {
  const colors = useColors();
  const { language: contextLanguage } = useLanguage();
  const activeLanguage = language ?? contextLanguage;
  const { width } = useWindowDimensions();
  const isCompact = width < 640;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.table}>
        {fields.map((field) => {
          const value = values[field.id] ?? "";
          const label = getRegistryFieldLabel(field.id, activeLanguage, {
            label: field.label ?? "",
            labelMy: field.labelMy,
            labelEn: field.labelEn,
          });
          return (
            <View
              key={field.id}
              style={[
                styles.row,
                isCompact && styles.rowCompact,
                { borderColor: colors.border, backgroundColor: editable ? colors.muted : colors.background },
              ]}
            >
              <View
                style={[
                  styles.labelCell,
                  isCompact && styles.labelCellCompact,
                  { backgroundColor: colors.navyLight },
                ]}
              >
                <Text style={[styles.labelText, { color: colors.primary }]}>{label}</Text>
              </View>
              <View style={[styles.valueCell, isCompact && styles.valueCellCompact]}>
                {editable ? (
                  <TextInput
                    value={value}
                    onChangeText={(next) => onChange?.(field.id, next)}
                    placeholder={label}
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.input,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        color: colors.foreground,
                        minHeight: field.type === "textarea" ? 72 : 44,
                      },
                      isCompact && styles.inputCompact,
                    ]}
                    multiline={field.type === "textarea"}
                    textAlignVertical={field.type === "textarea" ? "top" : "center"}
                  />
                ) : (
                  <Text style={[styles.valueText, { color: colors.foreground }]}>
                    {value ? value : "—"}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  title: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 10 },
  table: { gap: 8 },
  row: { borderWidth: 1, borderRadius: 12, overflow: "hidden", flexDirection: "row", alignItems: "stretch" },
  rowCompact: { flexDirection: "column" },
  labelCell: { paddingHorizontal: 12, paddingVertical: 8, width: 128, justifyContent: "center" },
  labelCellCompact: { width: "100%" },
  labelText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  valueCell: { flex: 1, padding: 12 },
  valueCellCompact: { paddingTop: 10 },
  valueText: { fontSize: 15, fontWeight: "500", minHeight: 20, lineHeight: 22, flexWrap: "wrap" },
  input: { width: "100%", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputCompact: { fontSize: 15 },
});
