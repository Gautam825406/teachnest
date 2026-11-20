import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, ProgressBar, SecondaryButton, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TestAttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(() => api.testDetail(id));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const questions = useMemo(() => data?.questions ?? [], [data]);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <Loading label="Loading test…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  if (!data || questions.length === 0) return <View style={styles.screen}><Empty message="This test has no questions yet." /></View>;

  const q = questions[index];
  const answeredCount = Object.keys(answers).length;
  const submit = async () => {
    setBusy(true);
    try {
      const res = await api.attemptTest(id, answers);
      router.replace({ pathname: '/test/result', params: { score: String(res.score), total: String(res.total_marks), correct: String(res.correct), questions: String(res.total_questions), title: data.title } });
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={[styles.heading, { marginBottom: 12 }]}>{data.title}</Text>

        {/* Progress + timer */}
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar total={questions.length} value={answeredCount} />
          </View>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.primarySoft,
              borderRadius: 999,
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Ionicons color={theme.primary} name="timer" size={16} />
            <Text style={{ color: theme.primary, fontVariant: ['tabular-nums'], ...type.captionBold, fontSize: 13 }}>
              {formatTime(seconds)}
            </Text>
          </View>
        </View>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Question {index + 1} of {questions.length} • {q.marks ?? 1} mark(s)
        </Text>

        <Card style={{ marginTop: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{q.question}</Text>
        </Card>

        {q.options.map((opt, i) => {
          const selected = answers[String(q.id)] === i;
          return (
            <Pressable
              key={i}
              onPress={() => setAnswers((a) => ({ ...a, [String(q.id)]: i }))}
              style={{
                alignItems: 'center',
                backgroundColor: selected ? theme.primarySoft : theme.surface,
                borderColor: selected ? theme.primary : theme.border,
                borderRadius: 12,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 12,
                marginBottom: 10,
                minHeight: 52,
                padding: 12,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: selected ? theme.primary : theme.surfaceMuted,
                  borderRadius: 14,
                  height: 28,
                  justifyContent: 'center',
                  width: 28,
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.white : theme.muted,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {LETTERS[i] ?? String.fromCharCode(65 + i)}
                </Text>
              </View>
              <Text style={{ color: selected ? theme.primarySoftText : theme.text, flex: 1, ...type.body }}>
                {opt}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[styles.muted, { marginTop: 4, textAlign: 'center' }]}>
          Answered: {answeredCount}/{questions.length}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton disabled={index === 0} label="Previous" onPress={() => setIndex(index - 1)} />
          </View>
          {index < questions.length - 1 ? (
            <View style={{ flex: 1 }}><PrimaryButton label="Next" onPress={() => setIndex(index + 1)} /></View>
          ) : (
            <View style={{ flex: 1 }}><PrimaryButton disabled={busy} label={busy ? 'Submitting…' : 'Submit Test'} onPress={submit} /></View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
