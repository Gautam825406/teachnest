import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { theme, type } from '../../config/theme';
import {
  Chip,
  Empty,
  ErrorBox,
  IconTile,
  PressableCard,
  SkeletonList,
  styles,
} from '../../components/ui';
import { api, inr } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function CoursesScreen() {
  const [query, setQuery] = useState('');
  const { data, error, loading, reload } = useApi(() => api.courses(1, 50));
  const [refreshing, setRefreshing] = useState(false);
  // Stagger only on first mount: once flipped, later renders use index 0.
  const hasAnimated = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      hasAnimated.current = true;
    }, 1200);
    return () => clearTimeout(id);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <SkeletonList />
      </View>
    );
  }
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items = (data?.items ?? []).filter((c) =>
    query.trim() === '' || c.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 20 }}
        data={items}
        keyExtractor={(c) => String(c.id)}
        ListEmptyComponent={<Empty icon="book-outline" message="No courses found." />}
        ListHeaderComponent={
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.background,
              borderColor: theme.border,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: 'row',
              height: 48,
              marginBottom: 12,
              marginTop: 16,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons color={theme.muted} name="search" size={20} />
            <TextInput
              onChangeText={setQuery}
              placeholder="Search courses…"
              style={{ color: theme.text, flex: 1, fontSize: 16, marginLeft: 10 }}
              value={query}
            />
            {query.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setQuery('')}>
                <Ionicons color={theme.muted} name="close-circle" size={20} />
              </Pressable>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />
        }
        renderItem={({ index, item }) => (
          <PressableCard
            index={hasAnimated.current ? 0 : index}
            onPress={() => router.push({ params: { id: String(item.id) }, pathname: '/course/[id]' })}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
              <IconTile initial={(item.title ?? 'C')[0]!.toUpperCase()} size={64} variant="dark" />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={styles.heading}>{item.title}</Text>
                <Text numberOfLines={2} style={[styles.muted, { marginTop: 2 }]}>
                  {item.description ?? ''}
                </Text>
                <Text style={{ color: theme.primary, marginTop: 6, ...type.body, fontWeight: '700' }}>
                  {inr(item.price)}{' '}
                  {item.mrp ? (
                    <Text style={{ color: theme.muted, textDecorationLine: 'line-through' }}>
                      {inr(item.mrp)}
                    </Text>
                  ) : null}
                </Text>
                {item.validity_days ? (
                  <View style={{ marginTop: 6 }}>
                    <Chip label={`Validity: ${item.validity_days} days`} variant="primary" />
                  </View>
                ) : null}
              </View>
              <Ionicons color={theme.muted} name="chevron-forward" size={20} />
            </View>
          </PressableCard>
        )}
        stickyHeaderIndices={[0]}
      />
    </View>
  );
}
