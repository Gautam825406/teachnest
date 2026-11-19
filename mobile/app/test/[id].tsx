import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

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
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.heading}>{data.title}</Text>
          <Text style={{ color: brand.primaryColor, fontWeight: '700' }}>⏱ {formatTime(seconds)}</Text>
        </View>
        <Text style={styles.muted}>Question {index + 1} of {questions.length} • {q.marks ?? 1} mark(s)</Text>
        <Card>
          <Text style={styles.body}>{q.question}</Text>
        </Card>
        {q.options.map((opt, i) => {
          const selected = answers[String(q.id)] === i;
          return (
            <Pressable
              key={i}
              onPress={() => setAnswers((a) => ({ ...a, [String(q.id)]: i }))}
              style={{ backgroundColor: selected ? brand.primaryColor : '#fff', borderColor: brand.border, borderRadius: 10, borderWidth: 1, marginBottom: 10, padding: 14 }}
            >
              <Text style={{ color: selected ? '#fff' : brand.text }}>{String.fromCharCode(65 + i)}. {opt}</Text>
            </Pressable>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton disabled={index === 0} label="← Previous" onPress={() => setIndex(index - 1)} />
          </View>
          {index < questions.length - 1 ? (
            <View style={{ flex: 1 }}><PrimaryButton label="Next →" onPress={() => setIndex(index + 1)} /></View>
          ) : (
            <View style={{ flex: 1 }}><PrimaryButton disabled={busy} label={busy ? 'Submitting…' : 'Submit Test'} onPress={submit} /></View>
          )}
        </View>
        <Text style={[styles.muted, { marginTop: 12, textAlign: 'center' }]}>
          Answered: {Object.keys(answers).length}/{questions.length}
        </Text>
      </View>
    </ScrollView>
  );
}
