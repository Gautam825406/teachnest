import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { radius, theme, type } from '../../config/theme';
import { Banner, PrimaryButton } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function OtpScreen() {
  const { phone, verifyOtp, otpDemo, otpDemoValue } = useAuth();
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const submit = async () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(otp.trim(), name.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed.';
      setError(msg);
      // If the backend asks for a name on first registration, the message
      // above will say so — the name field below covers that case.
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = (field: string) => ({
    backgroundColor: theme.surface,
    borderColor: focusedField === field ? theme.primary : theme.border,
    borderRadius: radius.input,
    borderWidth: 1,
    color: theme.text,
    fontSize: 16,
    height: 56,
    paddingHorizontal: 14,
  });

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View
        style={{
          backgroundColor: theme.primaryDark,
          height: 200,
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text style={{ color: theme.white, ...type.display }}>{brand.logoText}</Text>
        <Text style={{ color: theme.white, marginTop: 6, opacity: 0.8, ...type.body }}>
          {brand.tagline}
        </Text>
        <View
          style={{
            backgroundColor: theme.accent,
            borderRadius: 2,
            height: 4,
            marginTop: 14,
            width: 48,
          }}
        />
      </View>
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 20,
          elevation: 4,
          marginHorizontal: 20,
          marginTop: -40,
          padding: 20,
          shadowColor: theme.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }}
      >
        <Text style={{ color: theme.text, ...type.title }}>Enter OTP</Text>
        <Text style={{ color: theme.muted, marginTop: 4, ...type.body }}>
          Sent to +91 {phone || 'your mobile number'}.
        </Text>
        {otpDemo === true ? (
          <View style={{ marginTop: 16 }}>
            {otpDemoValue ? (
              <Banner
                title="Demo OTP — SMS not configured by the institute."
                variant="amber"
                body={`Your demo OTP is ${otpDemoValue}.`}
              />
            ) : (
              <Banner variant="amber" body="Demo OTP — SMS not configured by the institute." />
            )}
          </View>
        ) : otpDemo === false ? (
          <View style={{ marginTop: 16 }}>
            <Banner variant="green" body="OTP sent via SMS." />
          </View>
        ) : null}
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onBlur={() => setFocusedField(null)}
          onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
          onFocus={() => setFocusedField('otp')}
          placeholder="6-digit OTP"
          style={[
            inputStyle('otp'),
            { fontSize: 22, letterSpacing: 8, marginTop: 16, textAlign: 'center' },
          ]}
          value={otp}
        />
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 16 }}>
          Your name (first login only)
        </Text>
        <TextInput
          autoCapitalize="words"
          onBlur={() => setFocusedField(null)}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          placeholder="Full name — required on first registration"
          style={[inputStyle('name'), { marginVertical: 12 }]}
          value={name}
        />
        {error ? (
          <Text style={{ color: theme.danger, fontSize: 13, marginTop: 8 }}>{error}</Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <PrimaryButton disabled={busy} label={busy ? 'Verifying…' : 'Verify & Sign In'} onPress={submit} />
        </View>
      </View>
    </ScrollView>
  );
}
