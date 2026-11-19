import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { PrimaryButton, styles } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function OtpScreen() {
  const { phone, verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: brand.background, flex: 1 }}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={[styles.muted, { marginTop: 4 }]}>Sent to +91 {phone || 'your mobile number'}.</Text>
      <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, marginVertical: 16, padding: 12 }}>
        <Text style={{ color: '#92400e', fontWeight: '700' }}>
          Demo Mode: your OTP is 123456 — no SMS is sent.
        </Text>
      </View>
      <TextInput
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
        placeholder="123456"
        style={[styles.input, { letterSpacing: 8, textAlign: 'center' }]}
        value={otp}
      />
      <Text style={[styles.heading, { marginTop: 16 }]}>Your name (first login only)</Text>
      <TextInput
        autoCapitalize="words"
        onChangeText={setName}
        placeholder="Full name — required on first registration"
        style={[styles.input, { marginVertical: 8 }]}
        value={name}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={{ marginTop: 16 }}>
        <PrimaryButton disabled={busy} label={busy ? 'Verifying…' : 'Verify & Sign In'} onPress={submit} />
      </View>
    </ScrollView>
  );
}
