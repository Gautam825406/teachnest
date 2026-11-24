import { Stack } from 'expo-router';
import { brand } from '../../config/brand';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: brand.primaryColor }, headerTintColor: '#fff' }}>
      <Stack.Screen name="login" options={{ title: `Sign in — ${brand.instituteName}` }} />
      <Stack.Screen name="otp" options={{ title: 'Enter OTP' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
    </Stack>
  );
}
