import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { brand } from '../config/brand';

export const styles = StyleSheet.create({
  screen: { backgroundColor: brand.background, flex: 1, padding: 16 },
  card: { backgroundColor: brand.surface, borderColor: brand.border, borderRadius: 12, borderWidth: 1, marginBottom: 12, padding: 14 },
  title: { color: brand.text, fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: brand.text, fontSize: 17, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  heading: { color: brand.text, fontSize: 16, fontWeight: '700' },
  body: { color: brand.text, fontSize: 14, lineHeight: 20 },
  muted: { color: brand.muted, fontSize: 13, lineHeight: 18 },
  input: { backgroundColor: brand.surface, borderColor: brand.border, borderRadius: 10, borderWidth: 1, color: brand.text, fontSize: 16, padding: 12 },
  errorText: { color: brand.danger, fontSize: 13, marginTop: 8 },
});

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        alignItems: 'center', backgroundColor: disabled ? brand.muted : brand.primaryColor,
        borderRadius: 10, opacity: pressed ? 0.85 : 1, paddingVertical: 13,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator color={brand.primaryColor} size="large" />
      <Text style={[styles.muted, { marginTop: 10 }]}>{label}</Text>
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 24 }}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.card, { borderColor: brand.danger }]}>
      <Text style={{ color: brand.danger, fontWeight: '700' }}>Something went wrong</Text>
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
