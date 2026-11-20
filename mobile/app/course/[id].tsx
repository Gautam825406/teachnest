import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { theme, type } from '../../config/theme';
import { Card, Chip, Empty, ErrorBox, IconTile, Loading, PrimaryButton, styles } from '../../components/ui';
import { FadeIn } from '../../components/motion';
import { ApiError, api, formatDuration, inr, type CourseContentVideo, type PaymentOrder } from '../../lib/api';
import { openExternalUrl } from '../../lib/openLink';
import { useApi } from '../../lib/useApi';

// Sort by the backend `order` field; items without one keep their given order.
function byOrder<T extends { order?: number | null }>(items?: T[] | null): T[] {
  return [...(items ?? [])].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );
}

function VideoRow({ video, onPress }: { video: CourseContentVideo; onPress: () => void }) {
  const duration = formatDuration(video.duration_seconds);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center', backgroundColor: pressed ? theme.surfaceMuted : 'transparent',
        borderRadius: 8, flexDirection: 'row', gap: 10, paddingVertical: 8,
      })}
    >
      <Ionicons color={theme.primary} name="play-circle" size={24} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.body, { fontWeight: '600' }]}>{video.title}</Text>
        <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {duration ? <Chip label={duration} variant="default" /> : null}
          {video.is_free_preview ? <Chip label="Free Preview" variant="amber" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(() => api.course(id));
  // Course content is fetched separately so a missing/empty content response
  // never blocks the course detail itself — it degrades to the empty state.
  const { data: content, loading: contentLoading } = useApi(() => api.getCourseContent(id), [id]);
  const [expandedSubjects, setExpandedSubjects] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [purchased, setPurchased] = useState(false);
  // Order created with Cashfree, payment not yet verified.
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [paymentNote, setPaymentNote] = useState<string | null>(null);

  if (loading) return <Loading label="Loading course…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  if (!data) return <View style={styles.screen}><Empty message="Course not found." /></View>;

  const openPaymentPage = async (link: string) => {
    try {
      await openExternalUrl(link);
    } catch {
      Alert.alert('Could not open payment page', 'Check your connection and try again.');
    }
  };

  const toggleSubject = (subjectId: number) => {
    setExpandedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((s) => s !== subjectId) : [...prev, subjectId],
    );
  };

  // Videos open the same way the app already opens external video/payment
  // links: the in-app browser (see lib/openLink). There is no in-app video
  // player or WebView in this app, so no new player was built.
  const openVideo = async (video: CourseContentVideo) => {
    if (!video.video_url) {
      Alert.alert('Video unavailable', 'This lesson does not have a video link yet.');
      return;
    }
    try {
      await openExternalUrl(video.video_url);
    } catch {
      Alert.alert('Could not open video', 'Check your connection and try again.');
    }
  };

  const createOrder = async () => {
    setBusy(true);
    setPaymentNote(null);
    try {
      const created = await api.createPaymentOrder('course', id);
      if (!created.payment_link) {
        Alert.alert('Payment unavailable', 'The institute has not shared a payment page for this course. Please contact your institute.');
        return;
      }
      setOrder(created);
      await openPaymentPage(created.payment_link);
      setPaymentNote('Payment page opened. Complete the payment, then tap "Verify Payment" below.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        Alert.alert('Payments not configured yet', 'Payments not configured yet — please contact your institute.');
      } else if (e instanceof ApiError && e.status === 404) {
        Alert.alert('Payments not available yet', 'Payments are not available yet — please contact your institute.');
      } else {
        Alert.alert('Could not start payment', e instanceof Error ? e.message : 'Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const buy = () => {
    Alert.alert(
      'Pay via Cashfree',
      `You will be taken to the secure Cashfree payment page to pay ${inr(data.price)} for "${data.title}". Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue to Payment', onPress: () => void createOrder() },
      ],
    );
  };

  const verifyPayment = async () => {
    if (!order) return;
    setVerifying(true);
    try {
      const result = await api.verifyPayment(order.order_id);
      if (result.status === 'PAID') {
        setPurchased(true);
        setPaymentNote(null);
        Alert.alert('Payment successful', 'Your payment is confirmed and access to this course is granted. See My Courses in your profile.');
        await reload();
      } else if (result.status === 'PENDING') {
        setPaymentNote('Payment is still pending. If you just paid, wait a moment and tap "Verify Payment" again.');
      } else {
        setPaymentNote('Payment failed or was not completed. You can try paying again.');
        setOrder(null);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        Alert.alert('Could not verify payment', 'Payments are not available yet — please contact your institute.');
      } else {
        Alert.alert('Could not verify payment', e instanceof Error ? e.message : 'Try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const subjects = byOrder(content?.subjects);
  const generalVideos = byOrder(content?.videos);
  const hasContent = subjects.length > 0 || generalVideos.length > 0;
  const categoryLabel =
    data.category !== null && data.category !== undefined
      ? `Category: ${String(data.category)}`
      : data.category_id
        ? `Category ID: ${data.category_id}`
        : null;
  const buyLabel = purchased ? 'Purchased — Access Granted' : busy ? 'Starting payment…' : 'Buy Now';
  const buyDisabled = busy || purchased || !!order;

  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.primaryDark,
              borderRadius: 16,
              height: 200,
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 12,
                height: 72,
                justifyContent: 'center',
                width: 72,
              }}
            >
              <Text style={{ color: theme.white, fontSize: 32, fontWeight: '800' }}>
                {(data.title ?? 'C')[0]!.toUpperCase()}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={{ color: theme.white, fontSize: 20, fontWeight: '700', lineHeight: 26, marginTop: 12 }}
            >
              {data.title}
            </Text>
            {categoryLabel ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 999,
                  marginTop: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: theme.white, ...type.captionBold }}>{categoryLabel}</Text>
              </View>
            ) : null}
          </View>
          <Card style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ color: theme.primary, fontSize: 20, fontWeight: '700' }}>
                {inr(data.price)}{' '}
                {data.mrp ? (
                  <Text style={{ color: theme.muted, fontSize: 14, textDecorationLine: 'line-through' }}>
                    {inr(data.mrp)}
                  </Text>
                ) : null}
              </Text>
              {data.validity_days ? (
                <Chip label={`Validity: ${data.validity_days} days`} variant="primary" />
              ) : null}
            </View>
            <View style={{ marginTop: 12 }}>
              <PrimaryButton disabled={buyDisabled} label={buyLabel} onPress={buy} />
            </View>
          </Card>
          <Card>
            <Text style={styles.heading}>About this course</Text>
            <Text style={[styles.body, { marginTop: 6 }]}>{data.description ?? 'No description yet.'}</Text>
          </Card>
          {data.teacher_ids?.length ? (
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Ionicons color={theme.muted} name="people" size={18} />
              <Text style={styles.muted}>Teacher IDs: {data.teacher_ids.join(', ')}</Text>
            </View>
          ) : null}
          {data.drip_content || data.sequential_learning ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {data.drip_content ? <Chip label="Drip content enabled." variant="default" /> : null}
              {data.sequential_learning ? <Chip label="Sequential learning enabled." variant="default" /> : null}
            </View>
          ) : null}
          <Card>
            <Text style={styles.heading}>Course Content</Text>
            {contentLoading ? (
              <Text style={[styles.muted, { marginTop: 6 }]}>Loading lessons…</Text>
            ) : !hasContent ? (
              <Text style={[styles.muted, { marginTop: 6 }]}>No lessons added yet.</Text>
            ) : (
              <>
                {subjects.map((subject) => {
                  const expanded = expandedSubjects.includes(subject.id);
                  const topics = byOrder(subject.topics);
                  const videoCount = topics.reduce((n, t) => n + (t.videos?.length ?? 0), 0);
                  return (
                    <View key={subject.id} style={{ borderTopColor: theme.border, borderTopWidth: 1, marginTop: 10, paddingTop: 10 }}>
                      <Pressable onPress={() => toggleSubject(subject.id)}>
                        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                          <IconTile icon="folder" size={40} variant="primary" />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
                              {subject.name}
                            </Text>
                            <Text style={[styles.muted, { marginTop: 2 }]}>
                              {topics.length} topic{topics.length === 1 ? '' : 's'} · {videoCount} video{videoCount === 1 ? '' : 's'}
                            </Text>
                            {subject.description ? <Text style={styles.muted}>{subject.description}</Text> : null}
                          </View>
                          <Ionicons
                            color={theme.muted}
                            name="chevron-forward"
                            size={20}
                            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
                          />
                        </View>
                      </Pressable>
                      {expanded ? (
                        <FadeIn>
                          {topics.map((topic) => {
                            const videos = byOrder(topic.videos);
                            return (
                              <View key={topic.id} style={{ marginTop: 10, paddingLeft: 12 }}>
                                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
                                  <Ionicons color={theme.primary} name="list" size={18} />
                                  <Text style={[styles.body, { fontWeight: '700' }]}>{topic.name}</Text>
                                </View>
                                {topic.description ? <Text style={styles.muted}>{topic.description}</Text> : null}
                                {videos.length === 0 ? (
                                  <Text style={styles.muted}>No videos in this topic yet.</Text>
                                ) : (
                                  videos.map((video) => (
                                    <VideoRow key={video.id} video={video} onPress={() => void openVideo(video)} />
                                  ))
                                )}
                              </View>
                            );
                          })}
                        </FadeIn>
                      ) : null}
                    </View>
                  );
                })}
                {generalVideos.length > 0 ? (
                  <View style={{ borderTopColor: theme.border, borderTopWidth: 1, marginTop: 10, paddingTop: 10 }}>
                    <Text style={styles.heading}>General Videos</Text>
                    {generalVideos.map((video) => (
                      <VideoRow key={video.id} video={video} onPress={() => void openVideo(video)} />
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </Card>
          {order && !purchased ? (
            <Card>
              <Text style={styles.heading}>Order #{String(order.order_id)}</Text>
              <Text style={[styles.muted, { marginTop: 4 }]}>Amount: {inr(order.amount_rupees ?? data.price)}</Text>
              <Text style={[styles.muted, { marginTop: 4 }]}>Complete the payment on the Cashfree page, then verify it here.</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                <PrimaryButton disabled={verifying} label={verifying ? 'Verifying…' : 'Verify Payment'} onPress={() => void verifyPayment()} />
                {order.payment_link ? (
                  <PrimaryButton label="Open Payment Page Again" onPress={() => void openPaymentPage(order.payment_link as string)} />
                ) : null}
              </View>
            </Card>
          ) : null}
          {paymentNote ? <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>{paymentNote}</Text> : null}
          <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>Secure payment via Cashfree.</Text>
          <View style={{ height: 16 }} />
        </View>
      </ScrollView>
      {!purchased ? (
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: 1,
            padding: 16,
          }}
        >
          <PrimaryButton disabled={buyDisabled} label={buyLabel} onPress={buy} />
        </View>
      ) : null}
    </View>
  );
}
