import { Feather } from "@/components/AppIcons";
import { useColors } from "@/hooks/useColors";
import { canUseDriveApi, getDriveHealth, type DriveHealthState } from "@/lib/driveUpload";
import { useLanguage } from "@/context/LanguageContext";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type BannerTone = "success" | "warning" | "danger" | "info";

interface DriveStatusBannerProps {
  onHealthChange?: (health: DriveHealthState | null) => void;
}

export function DriveStatusBanner({ onHealthChange }: DriveStatusBannerProps) {
  const colors = useColors();
  const { language } = useLanguage();
  const [health, setHealth] = useState<DriveHealthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function text(my: string, en: string) {
    return language === "en" ? en : my;
  }

  async function loadHealth() {
    setLoading(true);
    try {
      if (!canUseDriveApi()) {
        setHealth({
          status: "unavailable",
          configured: false,
          folderConfigured: false,
          apiConfigured: false,
        });
        setError(null);
        onHealthChange?.({
          status: "unavailable",
          configured: false,
          folderConfigured: false,
          apiConfigured: false,
        });
        return;
      }
      const next = await getDriveHealth();
      setHealth(next);
      setError(null);
      onHealthChange?.(next);
    } catch (err: any) {
      const message =
        err?.message ??
        text(
          "Google Drive status ကို လောလောဆယ် မစစ်ဆေးနိုင်ပါ။",
          "Unable to check Google Drive status right now.",
        );
      setHealth(null);
      setError(message);
      onHealthChange?.(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  const display = useMemo(() => {
    if (loading) {
      return {
        tone: "info" as BannerTone,
        icon: "refresh-cw" as const,
        title: text("Drive status စစ်ဆေးနေသည်", "Checking Drive status"),
        body: text(
          "Google Drive status ကို စစ်ဆေးနေပါသည်…",
          "Checking Google Drive status…",
        ),
      };
    }

    if (error) {
      return {
        tone: "warning" as BannerTone,
        icon: "alert-triangle" as const,
        title: text(
          "Google Drive status မစစ်နိုင်သေးပါ",
          "Unable to check Google Drive status",
        ),
        body: error,
      };
    }

    if (!health) {
      return {
        tone: "warning" as BannerTone,
        icon: "alert-triangle" as const,
        title: text(
          "Google Drive status မစစ်နိုင်သေးပါ",
          "Unable to check Google Drive status",
        ),
        body: text(
          "Google Drive status ကို လောလောဆယ် မစစ်ဆေးနိုင်ပါ။",
          "Unable to check Google Drive status right now.",
        ),
      };
    }

    if (!health.apiConfigured) {
      return {
        tone: "info" as BannerTone,
        icon: "info" as const,
        title: text("Live preview service မချိတ်ရသေးပါ", "Live preview service not connected"),
        body: text(
          "Live preview service မချိတ်ရသေးပါ။ Drive link ကနေဖွင့် / download လုပ်လို့ရပြီး inline preview အတွက် backend API URL ထပ်သတ်မှတ်ရပါမယ်။",
          "The live preview service is not connected yet. You can still open or download the Drive file from the saved link below, and inline preview needs a backend API URL.",
        ),
      };
    }

    if (!health.configured) {
      return {
        tone: "danger" as BannerTone,
        icon: "alert-circle" as const,
        title: text(
          "Google Drive မချိတ်ဆက်ရသေးပါ",
          "Google Drive is not connected",
        ),
        body: text(
          "Google Drive connector မချိတ်ဆက်ရသေးပါ။ Admin ထံမှ Google account ချိတ်ရန် တောင်းဆိုပါ။",
          "Google Drive is not connected yet. Ask an admin to link the Google account before uploading.",
        ),
      };
    }

    if (!health.folderConfigured) {
      return {
        tone: "info" as BannerTone,
        icon: "info" as const,
        title: text("Google Drive ချိတ်ဆက်ထားသည်", "Drive connected"),
        body: text(
          "Drive ချိတ်ဆက်ပြီးသော်လည်း ပစ်မှတ် folder မသတ်မှတ်ရသေးပါ။ Upload များက Drive root သို့သွားမည်။",
          "Drive is connected, but no target folder is set. Uploads will go to the Drive root.",
        ),
      };
    }

    return {
      tone: "success" as BannerTone,
      icon: "check-circle" as const,
      title: text("Google Drive ချိတ်ဆက်ထားသည်", "Drive connected"),
      body: text(
        "Uploads will use the configured Drive folder.",
        "Uploads will use the configured Drive folder.",
      ),
    };
  }, [error, health, language, loading]);

  const theme = {
    success: {
      backgroundColor: colors.navyLight,
      borderColor: colors.primary,
      accent: colors.primary,
    },
    warning: {
      backgroundColor: colors.warningLight,
      borderColor: colors.warning,
      accent: colors.warning,
    },
    danger: {
      backgroundColor: "#fdecea",
      borderColor: colors.destructive,
      accent: colors.destructive,
    },
    info: {
      backgroundColor: colors.tealLight,
      borderColor: colors.border,
      accent: colors.accent,
    },
  }[display.tone];

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
        },
      ]}
    >
      <Feather name={display.icon} size={16} color={theme.accent} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {display.title}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {display.body}
        </Text>
      </View>
      <Pressable onPress={loadHealth} hitSlop={8} style={styles.refreshBtn}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Text style={[styles.refreshText, { color: theme.accent }]}>
            {text("ပြန်စစ်ရန်", "Refresh")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    fontSize: 12,
    lineHeight: 17,
  },
  refreshBtn: {
    paddingLeft: 6,
    paddingVertical: 2,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
