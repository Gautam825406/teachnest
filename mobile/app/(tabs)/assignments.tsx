import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { api, type Assignment } from '../../lib/api';
import { useApi } from '../../lib/useApi';

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
      {a.description ? <Text style={styles.muted}>{a.description}</Text> : null}
      {a.due_date ? <Text style={styles.muted}>Due: {a.due_date}</Text> : null}
      {a.status ? <Text style={styles.muted}>Status: {a.status}</Text> : null}
      {a.score !== null && a.score !== undefined ? <Text style={styles.muted}>Score: {a.score}</Text> : null}
      {kind === 'video' ? (
        <TextInput
          multiline
          onChangeText={setText}
          placeholder="Type your answer here…"
          style={[styles.input, { marginVertical: 10, minHeight: 70, textAlignVertical: 'top' }]}
          value={text}
        />
      ) : null}
      <PrimaryButton disabled={busy} label={busy ? 'Submitting…' : 'Submit'} onPress={submit} />
    </Card>
  );
}

export default function AssignmentsScreen() {
  const { data, error, loading, reload } = useApi(() => api.assignments());
  if (loading) return <Loading label="Loading assignments…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const video = data?.video_assignments ?? [];
  const test = data?.test_assignments ?? [];
  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Video Assignments</Text>
        {video.length === 0 ? <Empty message="No video assignments." /> : video.map((a) => (
          <AssignmentCard a={a} key={a.id} kind="video" onSubmitted={reload} />
        ))}
        <Text style={styles.sectionTitle}>Test Assignments</Text>
        {test.length === 0 ? <Empty message="No test assignments." /> : test.map((a) => (
          <AssignmentCard a={a} key={a.id} kind="test" onSubmitted={reload} />
        ))}
      </View>
    </ScrollView>
  );
}
