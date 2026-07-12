import { View, Text, TouchableOpacity, TextInput as RNInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadows } from "./Theme";

export function Btn({ title, onPress, variant = "primary", busy, icon, style, disabled, ...props }) {
  const bg = variant === "danger" ? colors.danger
    : variant === "ghost" ? "transparent"
    : colors.primary;
  const txt = variant === "ghost" ? colors.textSecondary : colors.text;
  const pd = variant === "ghost" ? spacing.sm : spacing.md;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.75}
      style={[btnStyles.base, { backgroundColor: bg, padding: pd }, style]}
      {...props}
    >
      {busy ? (
        <ActivityIndicator size="small" color={txt} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={txt} style={{ marginRight: spacing.xs }} />}
          <Text style={[btnStyles.text, { color: txt }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    minHeight: 48,
  },
  text: { fontSize: 16, fontWeight: "600" },
});

export function Card({ children, onPress, style, ...props }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[cardStyles.base, shadows.sm, style]}
      {...props}
    >
      {children}
    </Wrapper>
  );
}

const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});

export function Badge({ label, variant = "neutral", icon }) {
  const bg = variant === "success" ? "#DCFCE7"
    : variant === "danger" ? "#FEE2E2"
    : colors.bgSecondary;
  const tc = variant === "success" ? colors.success
    : variant === "danger" ? colors.danger
    : colors.textSecondary;
  return (
    <View style={[badgeStyles.base, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={14} color={tc} style={{ marginRight: 4 }} />}
      <Text style={[badgeStyles.label, { color: tc }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: { fontSize: 13, fontWeight: "600" },
});

export function Input({ style, ...props }) {
  return (
    <RNInput
      style={[inputStyles.base, style]}
      placeholderTextColor={colors.textLight}
      {...props}
    />
  );
}

const inputStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
});

export function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={emptyStyles.wrapper}>
      <Ionicons name={icon || "alert-circle"} size={64} color={colors.textSecondary} />
      <Text style={emptyStyles.title}>{title}</Text>
      {subtitle && <Text style={emptyStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg, padding: spacing.lg },
  title: { fontSize: 18, fontWeight: "600", color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
});
