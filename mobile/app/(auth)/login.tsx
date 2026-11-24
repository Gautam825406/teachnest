import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { radius, theme, type } from '../../config/theme';
import { PrimaryButton } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function LoginScreen() {
  const { requestOtp, loginWithPassword } = useAuth();
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [orgCode, setOrgCode] = useState<string>(brand.orgCode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
      if (mode === 'password') {
        if (!password) {
          setError('Enter your password.');
          return;
        }
        await loginWithPassword(orgCode.trim(), phone.trim(), password);
        router.replace('/(tabs)');
        return;
      }
      await requestOtp(orgCode.trim(), phone.trim());
      router.push('/(auth)/otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in. Try again.');
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
        {mode === 'password' ? (
          <>
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
              Password
            </Text>
            <TextInput
              onBlur={() => setFocusedField(null)}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              placeholder="Your account password"
              placeholderTextColor={theme.muted}
              secureTextEntry
              style={[inputStyle('password'), { marginVertical: 12 }]}
              value={password}
            />
          </>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            disabled={busy}
            label={busy ? (mode === 'password' ? 'Logging in…' : 'Sending OTP…') : mode === 'password' ? 'Log In' : 'Send OTP'}
            onPress={submit}
          />
        </View>
        <Text style={{ color: theme.muted, marginTop: 16, textAlign: 'center', ...type.caption }}>
          {mode === 'password'
            ? 'Log in with the password you set when creating your account.'
            : 'You will receive a 6-digit OTP on your mobile number.'}
        </Text>
        <Pressable
          onPress={() => {
            setError(null);
            setMode(mode === 'password' ? 'otp' : 'password');
          }}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
            {mode === 'password' ? 'Log in with OTP instead' : 'Log in with password'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ params: { org_code: orgCode.trim() }, pathname: '/(auth)/register' })}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
            New student? Create account
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
