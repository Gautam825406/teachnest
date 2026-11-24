import { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import {
  Banner,
  Card,
  Chip,
  Empty,
  ErrorBox,
  PrimaryButton,
  SectionHeader,
  SkeletonList,
  styles,
} from '../../components/ui';
import { api, toArray, type Doubt } from '../../lib/api';
import { useApi } from '../../lib/useApi';

type StatusChip = { label: string; variant: 'amber' | 'primary' | 'green' };

function statusChip(d: Doubt): StatusChip {
  if (d.status === 'answered') return { label: 'Teacher Answered', variant: 'green' };
  if (d.status === 'ai_answered') return { label: 'AI Answered', variant: 'primary' };
  return { label: 'Waiting for teacher', variant: 'amber' };
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DoubtsScreen() {
  const doubts = useApi(() => api.myDoubts());
  const subjects = useApi(() => api.doubtSubjects());
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const subjectOptions = subjects.data?.subjects ?? [];
  const usingCustomSubject = subjectOptions.length === 0 || subject === 'Other';
  const effectiveSubject = usingCustomSubject ? customSubject.trim() : subject;

  // Default to the first subject when the list loads.
  useEffect(() => {
    if (subjectOptions.length > 0 && !subject) setSubject(subjectOptions[0]!);
  }, [subjectOptions, subject]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([doubts.reload(), subjects.reload()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onSubmit = async () => {
    setSubmitError(null);
    setSubmitNote(null);
    const q = question.trim();
    if (!effectiveSubject) {
      setSubmitError('Pick or type a subject first.');
      return;
    }
    if (!q) {
      setSubmitError('Write your question first.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.askDoubt(effectiveSubject, q, topic.trim());
      setQuestion('');
      setTopic('');
      setSubmitNote(
        created.status === 'ai_answered'
          ? 'Your doubt got an instant AI answer — see it below. Your teacher can still reply.'
          : 'Doubt sent. No AI key is set up yet, so your teacher will answer it soon.',
      );
      setExpandedId(created.id);
      await doubts.reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not send your doubt.');
    } finally {
      setSubmitting(false);
    }
  };

  const list = toArray(doubts.data);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          colors={[theme.primary]}
          onRefresh={() => void onRefresh()}
          refreshing={refreshing}
          tintColor={theme.primary}
        />
      }
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        {/* Composer */}
        <Card>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.primarySoft,
                borderRadius: 12,
                height: 44,
                justifyContent: 'center',
                width: 44,
              }}
            >
              <Ionicons color={theme.primary} name="help-circle" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heading}>Ask a Doubt</Text>
              <Text style={[styles.muted, { marginTop: 2 }]}>
                Stuck on a question? Ask here — AI answers instantly when available.
              </Text>
            </View>
          </View>

          <Text style={[styles.heading, { fontSize: 13, marginTop: 16 }]}>Subject</Text>
          {subjects.loading ? (
            <Text style={[styles.muted, { marginTop: 6 }]}>Loading subjects…</Text>
          ) : subjectOptions.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {[...subjectOptions, 'Other'].map((s) => {
                const active = subject === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSubject(s)}
                    style={{
                      backgroundColor: active ? theme.primary : theme.surfaceMuted,
                      borderRadius: 999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? theme.white : theme.text,
                        fontSize: 13,
                        fontWeight: '700',
                      }}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {usingCustomSubject ? (
            <TextInput
              onChangeText={setCustomSubject}
              placeholder="Type the subject, e.g. Physics"
              placeholderTextColor={theme.muted}
              style={[styles.input, { marginTop: 8 }]}
              value={customSubject}
            />
          ) : null}

          <Text style={[styles.heading, { fontSize: 13, marginTop: 14 }]}>Topic (optional)</Text>
          <TextInput
            onChangeText={setTopic}
            placeholder="e.g. Wave Optics"
            placeholderTextColor={theme.muted}
            style={[styles.input, { marginTop: 6 }]}
            value={topic}
          />

          <Text style={[styles.heading, { fontSize: 13, marginTop: 14 }]}>Your question</Text>
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={setQuestion}
            placeholder="Type your doubt in detail…"
            placeholderTextColor={theme.muted}
            style={[styles.input, { marginTop: 6, minHeight: 96, textAlignVertical: 'top' }]}
            value={question}
          />

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          {submitNote ? (
            <View style={{ marginTop: 10 }}>
              <Banner body={submitNote} variant="green" />
            </View>
          ) : null}
          <View style={{ marginTop: 14 }}>
            <PrimaryButton
              disabled={submitting}
              label={submitting ? 'Sending…' : 'Ask Doubt'}
              onPress={() => void onSubmit()}
            />
          </View>
        </Card>

        {/* My doubts */}
        <SectionHeader title="My Doubts" />
        {doubts.loading && list.length === 0 ? (
          <SkeletonList />
        ) : doubts.error ? (
          <ErrorBox message={doubts.error} onRetry={doubts.reload} />
        ) : list.length === 0 ? (
          <Empty icon="help-circle-outline" message="No doubts yet. Ask your first question above!" />
        ) : (
          list.map((d) => {
            const chip = statusChip(d);
            const expanded = expandedId === d.id;
            return (
              <Pressable key={d.id} onPress={() => setExpandedId(expanded ? null : d.id)}>
                <Card>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                    <Chip label={d.subject} variant="primary" />
                    <Chip label={chip.label} variant={chip.variant} />
                    <View style={{ flex: 1 }} />
                    <Ionicons
                      color={theme.muted}
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                    />
                  </View>
                  <Text style={[styles.heading, { marginTop: 10 }]}>{d.question}</Text>
                  {d.topic ? (
                    <Text style={[styles.muted, { marginTop: 2 }]}>Topic: {d.topic}</Text>
                  ) : null}
                  <Text style={[styles.muted, { marginTop: 6 }]}>{formatDate(d.created_at)}</Text>

                  {expanded ? (
                    <>
                      {d.ai_answer ? (
                        <View
                          style={{
                            backgroundColor: theme.primarySoft,
                            borderRadius: 12,
                            marginTop: 12,
                            padding: 12,
                          }}
                        >
                          <Text style={{ color: theme.primary, ...type.captionBold }}>
                            AI answer {d.ai_provider ? `(${d.ai_provider})` : ''}
                          </Text>
                          <Text style={[styles.body, { marginTop: 4 }]}>{d.ai_answer}</Text>
                          <Text style={[styles.muted, { marginTop: 6 }]}>
                            AI answer — verify with your teacher.
                          </Text>
                        </View>
                      ) : null}
                      {d.teacher_reply ? (
                        <View
                          style={{
                            backgroundColor: theme.successSoft,
                            borderRadius: 12,
                            marginTop: 12,
                            padding: 12,
                          }}
                        >
                          <Text style={{ color: theme.successSoftText, ...type.captionBold }}>
                            Teacher&apos;s reply{d.teacher_name ? ` — ${d.teacher_name}` : ''}
                          </Text>
                          <Text style={[styles.body, { marginTop: 4 }]}>{d.teacher_reply}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.muted, { marginTop: 10 }]}>
                          No teacher reply yet — your teacher will answer from the admin panel.
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700', marginTop: 10 }}>
                      Tap to view answer
                    </Text>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
