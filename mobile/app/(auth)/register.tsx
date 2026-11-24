import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { radius, theme, type } from '../../config/theme';
import { PrimaryButton } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const params = useLocalSearchParams<{ org_code?: string }>();
  const [orgCode, setOrgCode] = useState<string>(
    typeof params.org_code === 'string' && params.org_code ? params.org_code : brand.orgCode,
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(orgCode.trim(), name.trim(), phone.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account. Try again.');
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
        <Text style={{ color: theme.white, ...type.display }}>Create account</Text>
        <Text style={{ color: theme.white, marginTop: 6, opacity: 0.8, ...type.body }}>
          Join {brand.instituteName} — no OTP needed.
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
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>Full name</Text>
        <TextInput
          autoCapitalize="words"
          onBlur={() => setFocusedField(null)}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          placeholder="e.g. Priya Patel"
          placeholderTextColor={theme.muted}
          style={[inputStyle('name'), { marginVertical: 12 }]}
          value={name}
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
            placeholderTextColor={theme.muted}
            style={{ color: theme.text, flex: 1, fontSize: 16, height: 56 }}
            value={phone}
          />
        </View>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>Password</Text>
        <TextInput
          onBlur={() => setFocusedField(null)}
          onChangeText={setPassword}
          onFocus={() => setFocusedField('password')}
          placeholder="At least 6 characters"
          placeholderTextColor={theme.muted}
          secureTextEntry
          style={[inputStyle('password'), { marginVertical: 12 }]}
          value={password}
        />
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>
          Confirm password
        </Text>
        <TextInput
          onBlur={() => setFocusedField(null)}
          onChangeText={setConfirm}
          onFocus={() => setFocusedField('confirm')}
          placeholder="Repeat your password"
          placeholderTextColor={theme.muted}
          secureTextEntry
          style={[inputStyle('confirm'), { marginVertical: 12 }]}
          value={confirm}
        />
        {error ? (
          <Text style={{ color: theme.danger, fontSize: 13, marginTop: 8 }}>{error}</Text>
        ) : null}
        <View style={{ marginTop: 16 }}>
          <PrimaryButton
            disabled={busy}
            label={busy ? 'Creating account…' : 'Create Account'}
            onPress={submit}
          />
        </View>
        <Text style={{ color: theme.muted, marginTop: 16, textAlign: 'center', ...type.caption }}>
          You will be logged in straight away — no OTP needed.
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
            Already have an account? Log in
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
