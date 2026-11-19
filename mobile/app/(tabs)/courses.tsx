import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Card, Empty, ErrorBox, Loading, styles } from '../../components/ui';
import { api, inr } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function CoursesScreen() {
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useApi(() => api.courses(1, 50));

  if (loading) return <Loading label="Loading courses…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items = (data?.items ?? []).filter((c) =>
    query.trim() === '' || c.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <View style={{ backgroundColor: '#f8fafc', flex: 1, padding: 16 }}>
      <TextInput
        onChangeText={setQuery}
        placeholder="Search courses…"
        style={[styles.input, { marginBottom: 12 }]}
        value={query}
      />
      <FlatList
        data={items}
        keyExtractor={(c) => String(c.id)}
        ListEmptyComponent={<Empty message="No courses found." />}
        renderItem={({ item }) => (
          <Link asChild href={{ pathname: '/course/[id]', params: { id: String(item.id) } }}>
            <Pressable>
              <Card>
                <Text style={styles.heading}>{item.title}</Text>
                <Text style={styles.muted}>{item.description ?? ''}</Text>
                <Text style={{ color: '#312e81', fontWeight: '700', marginTop: 6 }}>
                  {inr(item.price)} {item.mrp ? <Text style={{ color: '#64748b', textDecorationLine: 'line-through' }}>{inr(item.mrp)}</Text> : null}
                </Text>
                {item.validity_days ? <Text style={styles.muted}>Validity: {item.validity_days} days</Text> : null}
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
