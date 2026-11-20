import { Link } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { Chip, Empty, ErrorBox, PressableCard, SkeletonList, SectionHeader, styles } from '../../components/ui';
import { PressScale } from '../../components/motion';
import { api, toArray } from '../../lib/api';
import { useApi } from '../../lib/useApi';

function formatShortDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** PressableCard on first mount (staggered entrance); plain card afterwards. */
function GatedCard({
  animate,
  index,
  onPress,
  children,
}: {
  animate: boolean;
  index: number;
  onPress?: () => void;
  children: ReactNode;
}) {
  if (!animate) {
    return (
      <PressScale onPress={onPress}>
        <View style={styles.card}>{children}</View>
      </PressScale>
    );
  }
  return (
    <PressableCard index={index} onPress={onPress}>
      {children}
    </PressableCard>
  );
}

export default function TestsScreen() {
  const [tab, setTab] = useState<'series' | 'scores'>('series');
  const [refreshing, setRefreshing] = useState(false);
  const series = useApi(() => api.testSeries());
  const scores = useApi(() => api.scores(), []);
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([series.reload(), scores.reload()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      refreshControl={<RefreshControl colors={[theme.primary]} onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        {/* iOS-style segmented control */}
        <View
          style={{
            backgroundColor: theme.surfaceMuted,
            borderRadius: 999,
            flexDirection: 'row',
            padding: 4,
          }}
        >
          {(['series', 'scores'] as const).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={{
                  alignItems: 'center',
                  backgroundColor: active ? theme.surface : 'transparent',
                  borderRadius: 999,
                  flex: 1,
                  paddingVertical: 10,
                  ...(active ? theme.shadow : {}),
                }}
              >
                <Text
                  style={{
                    color: active ? theme.primary : theme.muted,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {t === 'series' ? 'Test Series' : 'Score Sheet'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'series' ? (
          <>
            <SectionHeader title="Test Series" />
            {series.loading ? <SkeletonList />
              : series.error ? <ErrorBox message={series.error} onRetry={series.reload} />
              : toArray(series.data).length === 0 ? <Empty message="No test series yet." />
              : toArray(series.data).map((t, i) => (
                <Link asChild href={{ pathname: '/test/[id]', params: { id: String(t.id) } }} key={t.id}>
                  <GatedCard animate={!hasAnimated.current} index={i}>
                    <Text style={styles.heading}>{t.title}</Text>
                    {t.description ? (
                      <Text style={[styles.muted, { marginTop: 2 }]}>{t.description ?? ''}</Text>
                    ) : null}
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 10 }}>
                      <Text style={{ color: theme.primary, ...type.bodyBold }}>Start Test</Text>
                      <Ionicons color={theme.primary} name="arrow-forward" size={16} />
                    </View>
                  </GatedCard>
                </Link>
              ))}
          </>
        ) : (
          <>
            <SectionHeader title="My Scores" />
            {scores.loading ? <SkeletonList />
              : scores.error ? <ErrorBox message={scores.error} onRetry={scores.reload} />
              : toArray(scores.data).length === 0 ? <Empty message="No scores yet — attempt a test first." />
              : toArray(scores.data).map((s, i) => (
                <GatedCard animate={!hasAnimated.current} index={i} key={s.id ?? i}>
                  <Text style={styles.heading}>{s.test_series_title ?? s.chapter_test ?? s.title ?? 'Test'}</Text>
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 18,
                      fontVariant: ['tabular-nums'],
                      fontWeight: '700',
                      lineHeight: 24,
                      marginTop: 8,
                    }}
                  >
                    {s.score ?? '—'} / {s.total_marks ?? '—'}
                  </Text>
                  {s.correct !== undefined ? (
                    <View style={{ marginTop: 8 }}>
                      <Chip label={`Correct: ${s.correct}/${s.total_questions ?? '—'}`} variant="primary" />
                    </View>
                  ) : null}
                  {s.created_at ? (
                    <Text style={[styles.muted, { marginTop: 8 }]}>{formatShortDate(s.created_at)}</Text>
                  ) : null}
                </GatedCard>
              ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
