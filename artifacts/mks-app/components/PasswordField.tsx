import { Feather } from "@/components/AppIcons";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PasswordAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  editable?: boolean;
  actions?: PasswordAction[];
};

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  editable = true,
  actions = [],
}: PasswordFieldProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        <Feather name="lock" size={16} color={colors.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={!showPassword}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setShowPassword((current) => !current)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.toggleBtn}
        >
          <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
          <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>{t(showPassword ? "hidePassword" : "showPassword")}</Text>
        </TouchableOpacity>
      </View>
      {helperText ? <Text style={[styles.helperText, { color: colors.mutedForeground }]}>{helperText}</Text> : null}
      {actions.length ? (
        <View style={styles.actionsRow}>
          {actions.map((action) => {
            const backgroundColor =
              action.variant === "primary"
                ? colors.primary
                : action.variant === "danger"
                  ? colors.destructive
                  : colors.muted;
            const borderColor =
              action.variant === "primary"
                ? colors.primary
                : action.variant === "danger"
                  ? colors.destructive
                  : colors.border;
            const textColor =
              action.variant === "primary" || action.variant === "danger"
                ? "#fff"
                : colors.foreground;
            return (
              <TouchableOpacity
                key={action.label}
                onPress={action.onPress}
                disabled={action.disabled}
                style={[
                  styles.actionBtn,
                  { backgroundColor, borderColor, opacity: action.disabled ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.actionText, { color: textColor }]}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, fontSize: 14 },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleText: { fontSize: 12, fontWeight: "700" },
  helperText: { fontSize: 12, lineHeight: 18 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: "700" },
});
