import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { radius, theme, type } from '../../config/theme';
import { PrimaryButton } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function LoginScreen() {
  const { requestOtp } = useAuth();
  const [orgCode, setOrgCode] = useState<string>(brand.orgCode);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>
          Organisation code
        </Text>
        <TextInput
          autoCapitalize="characters"
          onBlur={() => setFocusedField(null)}
          onChangeText={setOrgCode}
          onFocus={() => setFocusedField('org')}
          style={[inputStyle('org'), { marginVertical: 12 }]}
          value={orgCode}
        />
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>
          Mobile number
        </Text>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderColor: focusedField === 'phone' ? theme.primary : theme.border,
            borderRadius: radius.input,
            borderWidth: 1,
            flexDirection: 'row',
            height: 56,
            marginVertical: 12,
            paddingLeft: 12,
          }}
        >
          <View
            style={{
              backgroundColor: theme.primarySoft,
              borderRadius: radius.pill,
              marginRight: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: theme.primarySoftText, ...type.captionBold }}>+91</Text>
          </View>
          <TextInput
            keyboardType="phone-pad"
            maxLength={10}
            onBlur={() => setFocusedField(null)}
            onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
            onFocus={() => setFocusedField('phone')}
            placeholder="10-digit mobile number"
            style={{ color: theme.text, flex: 1, fontSize: 16, height: 56 }}
            value={phone}
          />
        </View>
        {error ? (
          <Text style={{ color: theme.danger, fontSize: 13, marginTop: 8 }}>{error}</Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <PrimaryButton disabled={busy} label={busy ? 'Sending OTP…' : 'Send OTP'} onPress={submit} />
        </View>
        <Text style={{ color: theme.muted, marginTop: 16, textAlign: 'center', ...type.caption }}>
          You will receive a 6-digit OTP on your mobile number.
        </Text>
      </View>
    </ScrollView>
  );
}
