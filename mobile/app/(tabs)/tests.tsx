import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, styles } from '../../components/ui';
import { api, toArray } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function TestsScreen() {
  const [tab, setTab] = useState<'series' | 'scores'>('series');
  const series = useApi(() => api.testSeries());
  const scores = useApi(() => api.scores(), []);

  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['series', 'scores'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{ backgroundColor: tab === t ? brand.primaryColor : '#fff', borderColor: brand.border, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Text style={{ color: tab === t ? '#fff' : brand.text, fontWeight: '700' }}>
                {t === 'series' ? 'Test Series' : 'Score Sheet'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'series' ? (
          <>
            <Text style={styles.sectionTitle}>Test Series</Text>
            {series.loading ? <Loading label="Loading test series…" />
              : series.error ? <ErrorBox message={series.error} onRetry={series.reload} />
              : toArray(series.data).length === 0 ? <Empty message="No test series yet." />
              : toArray(series.data).map((t) => (
                <Link asChild href={{ pathname: '/test/[id]', params: { id: String(t.id) } }} key={t.id}>
                  <Pressable>
                    <Card>
                      <Text style={styles.heading}>{t.title}</Text>
                      <Text style={styles.muted}>{t.description ?? ''}</Text>
                      <Text style={{ color: brand.primaryColor, fontWeight: '700', marginTop: 6 }}>Start Test →</Text>
                    </Card>
                  </Pressable>
                </Link>
              ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>My Scores</Text>
            {scores.loading ? <Loading label="Loading scores…" />
              : scores.error ? <ErrorBox message={scores.error} onRetry={scores.reload} />
              : toArray(scores.data).length === 0 ? <Empty message="No scores yet — attempt a test first." />
              : toArray(scores.data).map((s, i) => (
                <Card key={s.id ?? i}>
                  <Text style={styles.heading}>{s.test_series_title ?? s.chapter_test ?? s.title ?? 'Test'}</Text>
                  <Text style={styles.muted}>
                    Score: {s.score ?? '—'} / {s.total_marks ?? '—'}
                    {s.correct !== undefined ? ` • Correct: ${s.correct}/${s.total_questions ?? '—'}` : ''}
                  </Text>
                  {s.created_at ? <Text style={styles.muted}>{s.created_at}</Text> : null}
                </Card>
              ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
