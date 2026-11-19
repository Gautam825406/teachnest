import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/AuthContext';
import { brand } from '../config/brand';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: brand.primaryColor },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]" options={{ title: 'Course Details' }} />
        <Stack.Screen name="test/[id]" options={{ title: 'Test' }} />
        <Stack.Screen name="test/result" options={{ title: 'Test Result' }} />
        <Stack.Screen name="learn/[section]" options={{ title: 'Learn' }} />
        <Stack.Screen name="live/[id]" options={{ title: 'Live Class' }} />
      </Stack>
    </AuthProvider>
  );
}
