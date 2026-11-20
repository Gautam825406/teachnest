import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { Card, Chip, Empty, ErrorBox, Loading, PrimaryButton, SectionHeader, styles } from '../../components/ui';
import { FadeIn, staggerDelay } from '../../components/motion';
import { api, type Assignment } from '../../lib/api';
import { useApi } from '../../lib/useApi';

function formatShortDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Due-date chip with a calendar icon (Chip has no icon slot). */
function DueChip({ date }: { date: string }) {
  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: theme.surfaceMuted,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Ionicons color={theme.muted} name="calendar" size={14} />
      <Text style={{ color: theme.muted, ...type.captionBold }}>Due: {formatShortDate(date)}</Text>
    </View>
  );
}

/** Status chip only when the API provides a status — never invented. */
function StatusChip({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const variant = lower.includes('submit') ? 'green' : lower.includes('pending') ? 'amber' : 'default';
  return <Chip label={status} variant={variant} />;
}

function AssignmentCard({ a, kind, onSubmitted }: { a: Assignment; kind: 'video' | 'test'; onSubmitted: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      if (kind === 'video') await api.submitVideoAssignment(a.id, { text: text || undefined });
      else await api.submitTestAssignment(a.id);
      Alert.alert('Submitted', 'Your assignment was submitted.');
      onSubmitted();
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={styles.heading}>{a.title}</Text>
      {a.description ? <Text style={[styles.muted, { marginTop: 2 }]}>{a.description}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {a.due_date ? <DueChip date={a.due_date} /> : null}
        {a.status ? <StatusChip status={a.status} /> : null}
        {a.score !== null && a.score !== undefined ? (
          <Chip label={`Score: ${a.score}`} variant="primary" />
        ) : null}
      </View>
      {kind === 'video' ? (
        <TextInput
          multiline
          onChangeText={setText}
          placeholder="Type your answer here…"
          style={[styles.input, { marginVertical: 12, minHeight: 90, textAlignVertical: 'top' }]}
          value={text}
        />
      ) : null}
      <PrimaryButton disabled={busy} label={busy ? 'Submitting…' : 'Submit'} onPress={submit} />
    </Card>
  );
}

export default function AssignmentsScreen() {
  const { data, error, loading, reload } = useApi(() => api.assignments());
  const [refreshing, setRefreshing] = useState(false);
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <Loading label="Loading assignments…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const video = data?.video_assignments ?? [];
  const test = data?.test_assignments ?? [];

  // FadeIn wrapper only on first mount; plain render afterwards.
  const wrap = (node: ReactNode, key: string | number, index: number) =>
    hasAnimated.current ? (
      <View key={key}>{node}</View>
    ) : (
      <FadeIn delay={staggerDelay(index)} key={key}>
        {node}
      </FadeIn>
    );

  return (
    <ScrollView
      refreshControl={<RefreshControl colors={[theme.primary]} onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        <SectionHeader title="Video Assignments" />
        {video.length === 0 ? <Empty message="No video assignments." /> : video.map((a, i) =>
          wrap(<AssignmentCard a={a} kind="video" onSubmitted={reload} />, a.id, i),
        )}
        <SectionHeader title="Test Assignments" />
        {test.length === 0 ? <Empty message="No test assignments." /> : test.map((a, i) =>
          wrap(<AssignmentCard a={a} kind="test" onSubmitted={reload} />, a.id, i),
        )}
      </View>
    </ScrollView>
  );
}
