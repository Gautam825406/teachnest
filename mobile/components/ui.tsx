import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radius, spacing, theme, type } from '../config/theme';
import { FadeIn, PressScale, Skeleton, staggerDelay } from './motion';

export const styles = StyleSheet.create({
  screen: { backgroundColor: theme.background, flex: 1, padding: spacing.screen },
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.gap,
    padding: spacing.card,
    ...theme.shadow,
  },
  title: { color: theme.text, ...type.title },
  sectionTitle: { color: theme.text, ...type.section, marginBottom: 8, marginTop: 16 },
  heading: { color: theme.text, ...type.heading },
  body: { color: theme.text, ...type.body },
  muted: { color: theme.muted, ...type.caption, lineHeight: 18 },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: radius.input,
    borderWidth: 1,
    color: theme.text,
    fontSize: 16,
    padding: 12,
  },
  errorText: { color: theme.danger, fontSize: 13, marginTop: 8 },
});

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressScale onPress={onPress} disabled={disabled}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: disabled ? theme.muted : theme.primary,
          borderRadius: radius.button,
          justifyContent: 'center',
          minHeight: 52,
          opacity: disabled ? 0.7 : 1,
          paddingVertical: 13,
        }}
      >
        <Text style={{ color: theme.white, ...type.button }}>{label}</Text>
      </View>
    </PressScale>
  );
}

/** Secondary outline button (same height as PrimaryButton). */
export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressScale onPress={onPress} disabled={disabled}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.surface,
          borderColor: theme.primary,
          borderRadius: radius.button,
          borderWidth: 1,
          justifyContent: 'center',
          minHeight: 52,
          opacity: disabled ? 0.6 : 1,
          paddingVertical: 13,
        }}
      >
        <Text style={{ color: theme.primary, ...type.button }}>{label}</Text>
      </View>
    </PressScale>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[styles.muted, { marginTop: 10 }]}>{label}</Text>
    </View>
  );
}

/** Skeleton list shown while a list loads (3 placeholder cards). */
export function SkeletonList() {
  return (
    <View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { flexDirection: 'row', gap: 12 }]}>
          <Skeleton style={{ borderRadius: 12, height: 64, width: 64 }} />
          <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
            <Skeleton style={{ height: 14, width: '80%' }} />
            <Skeleton style={{ height: 12, width: '60%' }} />
            <Skeleton style={{ height: 12, width: '40%' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Empty({
  message,
  icon = 'information-circle-outline',
}: {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ alignItems: 'center', padding: 32 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.surfaceMuted,
          borderRadius: 36,
          height: 72,
          justifyContent: 'center',
          marginBottom: 12,
          width: 72,
        }}
      >
        <Ionicons color={theme.muted} name={icon} size={32} />
      </View>
      <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text>
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.card, { borderColor: theme.danger }]}>
      <Text style={{ color: theme.danger, fontWeight: '700' }}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton label="Retry" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Tappable card with press-scale feedback and soft shadow. */
export function PressableCard({
  children,
  onPress,
  style,
  index = 0,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  index?: number;
}) {
  return (
    <FadeIn delay={staggerDelay(index)}>
      <PressScale onPress={onPress}>
        <View style={[styles.card, style]}>{children}</View>
      </PressScale>
    </FadeIn>
  );
}

type ChipVariant = 'default' | 'primary' | 'amber' | 'green' | 'danger';

const chipStyles: Record<ChipVariant, { bg: string; fg: string }> = {
  default: { bg: theme.surfaceMuted, fg: theme.muted },
  primary: { bg: theme.primarySoft, fg: theme.primarySoftText },
  amber: { bg: theme.accentSoft, fg: theme.accentSoftText },
  green: { bg: theme.successSoft, fg: theme.successSoftText },
  danger: { bg: theme.dangerSoft, fg: theme.danger },
};

export function Chip({
  label,
  variant = 'default',
  style,
}: {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}) {
  const c = chipStyles[variant];
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: c.bg,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      <Text style={{ color: c.fg, ...type.captionBold }}>{label}</Text>
    </View>
  );
}

/** Section title with an optional right-side action. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        marginTop: 20,
      }}
    >
      <Text style={{ color: theme.text, ...type.section }}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type TileVariant = 'primary' | 'accent' | 'green' | 'dark';
type TileSize = 40 | 48 | 56 | 64 | 72;

const tileStyles: Record<TileVariant, { bg: string; fg: string }> = {
  primary: { bg: theme.primarySoft, fg: theme.primary },
  accent: { bg: theme.accentSoft, fg: theme.accentSoftText },
  green: { bg: theme.successSoft, fg: theme.successSoftText },
  dark: { bg: theme.primaryDark, fg: theme.white },
};

/** Rounded icon tile, or an initial tile when `initial` is given. */
export function IconTile({
  icon,
  initial,
  variant = 'primary',
  size = 40,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  initial?: string;
  variant?: TileVariant;
  size?: TileSize;
}) {
  const t = tileStyles[variant];
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: t.bg,
        borderRadius: radius.tile,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      {initial ? (
        <Text style={{ color: t.fg, fontSize: size * 0.42, fontWeight: '800' }}>
          {initial}
        </Text>
      ) : icon ? (
        <Ionicons color={t.fg} name={icon} size={size * 0.55} />
      ) : null}
    </View>
  );
}

/** Circle avatar with initials. */
export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.primaryDark,
        borderRadius: size / 2,
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      <Text style={{ color: theme.white, fontSize: size * 0.36, fontWeight: '800' }}>
        {initials || 'S'}
      </Text>
    </View>
  );
}

type BannerVariant = 'amber' | 'green' | 'red';
const bannerStyles: Record<BannerVariant, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  amber: { bg: theme.accentSoft, fg: theme.accentSoftText, icon: 'information-circle' },
  green: { bg: theme.successSoft, fg: theme.successSoftText, icon: 'checkmark-circle' },
  red: { bg: theme.dangerSoft, fg: theme.danger, icon: 'alert-circle' },
};

/** Coloured info strip with icon + title + body. */
export function Banner({
  variant = 'amber',
  title,
  body,
  style,
}: {
  variant?: BannerVariant;
  title?: string;
  body: string;
  style?: ViewStyle;
}) {
  const b = bannerStyles[variant];
  return (
    <View
      style={[
        {
          backgroundColor: b.bg,
          borderRadius: radius.banner,
          flexDirection: 'row',
          gap: 10,
          marginBottom: spacing.gap,
          padding: 14,
        },
        style,
      ]}
    >
      <Ionicons color={b.fg} name={b.icon} size={20} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? (
          <Text style={{ color: b.fg, ...type.bodyBold, marginBottom: 2 }}>{title}</Text>
        ) : null}
        <Text style={{ color: b.fg, ...type.body }}>{body}</Text>
      </View>
    </View>
  );
}

/** 6px progress track with animated fill. */
export function ProgressBar({
  value,
  total,
  color = theme.primary,
  style,
}: {
  value: number;
  total: number;
  color?: string;
  style?: ViewStyle;
}) {
  const width = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  useEffect(() => {
    const anim = Animated.timing(width, {
      toValue: pct,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [pct, width]);
  return (
    <View
      style={[
        { backgroundColor: theme.surfaceMuted, borderRadius: 3, height: 6, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{
          backgroundColor: color,
          borderRadius: 3,
          height: 6,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  style,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, { flex: 1, marginBottom: 0 }, style]}>
      {icon ? <Ionicons color={theme.primary} name={icon} size={20} style={{ marginBottom: 6 }} /> : null}
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', lineHeight: 26 } as TextStyle}>
        {value}
      </Text>
      <Text
        style={{
          color: theme.muted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
