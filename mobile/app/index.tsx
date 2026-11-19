import { Redirect } from 'expo-router';
import { Loading } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

export default function Index() {
  const { loading, token } = useAuth();
  if (loading) return <Loading label="Loading…" />;
  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
