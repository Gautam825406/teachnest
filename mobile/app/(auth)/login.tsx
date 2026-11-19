import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { PrimaryButton, styles } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function LoginScreen() {
  const { requestOtp } = useAuth();
  const [orgCode, setOrgCode] = useState<string>(brand.orgCode);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestOtp(orgCode.trim(), phone.trim());
      router.push('/(auth)/otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: brand.background, flex: 1 }}>
      <Text style={[styles.title, { color: brand.primaryColor, fontSize: 28, marginTop: 24 }]}>{brand.logoText}</Text>
      <Text style={[styles.muted, { marginBottom: 24, marginTop: 4 }]}>{brand.tagline}</Text>
      <Text style={styles.heading}>Organisation code</Text>
      <TextInput autoCapitalize="characters" onChangeText={setOrgCode} style={[styles.input, { marginVertical: 8 }]} value={orgCode} />
      <Text style={styles.heading}>Mobile number</Text>
      <TextInput
        keyboardType="phone-pad"
        maxLength={10}
        onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
        placeholder="10-digit mobile number"
        style={[styles.input, { marginVertical: 8 }]}
        value={phone}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={{ marginTop: 16 }}>
        <PrimaryButton disabled={busy} label={busy ? 'Sending OTP…' : 'Send OTP'} onPress={submit} />
      </View>
      <Text style={[styles.muted, { marginTop: 16 }]}>
        Demo Mode: no SMS is sent. Your OTP is always 123456.
      </Text>
    </ScrollView>
  );
}
