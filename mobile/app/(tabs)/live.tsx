import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, styles } from '../../components/ui';
import { api, toArray } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function LiveScreen() {
  const { data, error, loading, reload } = useApi(() => api.seminars());
  if (loading) return <Loading label="Loading seminars…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items = toArray(data);
  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, marginBottom: 12, padding: 12 }}>
          <Text style={{ color: '#92400e', fontWeight: '700' }}>
            DEMO — live video is not connected yet (Phase 4).
          </Text>
          <Text style={{ color: '#92400e' }}>Seminars below come from the API; joining opens a demo placeholder screen.</Text>
        </View>
        <Text style={styles.sectionTitle}>Live Classes & Seminars</Text>
        {items.length === 0 ? <Empty message="No live classes or seminars scheduled yet." /> : items.map((s) => (
          <Link asChild href={{ pathname: '/live/[id]', params: { id: String(s.id), title: s.title } }} key={s.id}>
            <Pressable>
              <Card>
                <Text style={styles.heading}>{s.title}</Text>
                {s.description ? <Text style={styles.muted}>{s.description}</Text> : null}
                {s.scheduled_at ? <Text style={styles.muted}>Scheduled: {s.scheduled_at}</Text> : null}
                <Text style={{ color: brand.primaryColor, fontWeight: '700', marginTop: 6 }}>Join Live Class →</Text>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
