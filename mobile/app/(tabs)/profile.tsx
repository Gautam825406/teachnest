import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { brand } from '../../config/brand';
import { API_URL, api, inr, toArray } from '../../lib/api';
import { Avatar, Card, Chip, Empty, ErrorBox, IconTile, Loading, PressableCard, PrimaryButton, SecondaryButton, SectionHeader, styles } from '../../components/ui';
import { PressScale } from '../../components/motion';
import { useAuth } from '../../lib/AuthContext';
import { useApi } from '../../lib/useApi';

/** PressableCard on first mount (staggered entrance); plain card afterwards. */
function GatedCard({
  animate,
  index,
  onPress,
  style,
  children,
}: {
  animate: boolean;
  index: number;
  onPress?: () => void;
  style?: ViewStyle;
  children: ReactNode;
}) {
  if (!animate) {
    return (
      <PressScale onPress={onPress}>
        <View style={[styles.card, style]}>{children}</View>
      </PressScale>
    );
  }
  return (
    <PressableCard index={index} onPress={onPress} style={style}>
      {children}
    </PressableCard>
  );
}

type Section = 'main' | 'courses' | 'orders' | 'notifications' | 'help';

const MENU: { label: string; target: Section; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'My Courses', target: 'courses', icon: 'book' },
  { label: 'My Orders', target: 'orders', icon: 'receipt' },
  { label: 'Notifications', target: 'notifications', icon: 'notifications' },
  { label: 'Help & Support', target: 'help', icon: 'help-circle' },
];

export default function ProfileScreen() {
  const { student, logout } = useAuth();
  const [section, setSection] = useState<Section>('main');
  const [enquiry, setEnquiry] = useState('');
  const [enquiryBusy, setEnquiryBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Live payment status per order, fetched on demand from /student/payments/{id}.
  const [paymentStatus, setPaymentStatus] = useState<Record<string, { status: string; busy: boolean; error?: string }>>({});

  const checkPaymentStatus = async (orderId: string | number) => {
    const key = String(orderId);
    setPaymentStatus((prev) => ({ ...prev, [key]: { status: prev[key]?.status ?? '', busy: true } }));
    try {
      const record = await api.getPayment(orderId);
      setPaymentStatus((prev) => ({ ...prev, [key]: { status: record.status ?? '—', busy: false } }));
    } catch (e) {
      setPaymentStatus((prev) => ({
        ...prev,
        [key]: { status: prev[key]?.status ?? '', busy: false, error: 'Status not available for this order.' },
      }));
    }
  };

  const courses = useApi(() => api.myCourses(), []);
  const orders = useApi(() => api.myOrders(), []);
  const notifications = useApi(() => api.notifications(), []);
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([courses.reload(), orders.reload(), notifications.reload()]);
    } finally {
      setRefreshing(false);
    }
  };

  const doLogout = () => {
    Alert.alert('Log out?', 'You will need your OTP to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const submitEnquiry = async () => {
    if (!enquiry.trim()) { Alert.alert('Write your message first.'); return; }
    setEnquiryBusy(true);
    try {
      await api.enquiry(enquiry.trim());
      setEnquiry('');
      Alert.alert('Sent', 'Your enquiry was submitted. The institute will get back to you.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.');
    } finally { setEnquiryBusy(false); }
  };

  const backRow = (
    <Pressable
      hitSlop={8}
      onPress={() => setSection('main')}
      style={{ alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 16, paddingVertical: 8 }}
    >
      <Ionicons color={theme.primary} name="arrow-back" size={18} />
      <Text style={{ color: theme.primary, ...type.bodyBold }}>Back to Profile</Text>
    </Pressable>
  );

  return (
    <ScrollView
      refreshControl={<RefreshControl colors={[theme.primary]} onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        {/* Header card */}
        <Card>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
            <Avatar name={student?.name ?? 'Student'} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>
                {student?.name ?? 'My Profile'}
              </Text>
              {student?.phone ? (
                <Text style={[styles.muted, { marginTop: 2 }]}>+91 {student.phone}</Text>
              ) : null}
              {student?.email ? <Text style={styles.muted}>{student.email}</Text> : null}
              {student?.city || student?.state ? (
                <Text style={styles.muted}>{[student.city, student.state].filter(Boolean).join(', ')}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        {section === 'main' ? (
          <View style={{ marginTop: 4 }}>
            {MENU.map((m, i) => (
              <GatedCard
                animate={!hasAnimated.current}
                index={i}
                key={m.label}
                onPress={() => setSection(m.target)}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
                  <IconTile icon={m.icon} size={40} variant="primary" />
                  <Text style={{ color: theme.text, flex: 1, ...type.heading }}>{m.label}</Text>
                  <Ionicons color={theme.muted} name="chevron-forward" size={20} />
                </View>
              </GatedCard>
            ))}

            <SectionHeader title="Settings" />
            <View style={{ gap: 4 }}>
              <Text style={styles.muted}>API URL: {API_URL}</Text>
              <Text style={styles.muted}>Institute: {brand.instituteName} ({brand.orgCode})</Text>
              <Text style={styles.muted}>Theme: primary {brand.primaryColor}, accent {brand.accentColor}</Text>
              <Text style={styles.muted}>App: {brand.appName} v3.0.0 (Phase 4)</Text>
            </View>

            <View style={{ marginTop: 20 }}>
              <GatedCard
                animate={!hasAnimated.current}
                index={MENU.length}
                onPress={doLogout}
                style={{ borderColor: theme.danger }}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
                  <Ionicons color={theme.danger} name="log-out" size={22} />
                  <Text style={{ color: theme.danger, flex: 1, ...type.heading }}>Log Out</Text>
                </View>
              </GatedCard>
            </View>
          </View>
        ) : (
          backRow
        )}

        {section === 'courses' && (
          <>
            <SectionHeader title="My Courses" />
            {courses.loading ? <Loading label="Loading my courses…" />
              : courses.error ? <ErrorBox message={courses.error} onRetry={courses.reload} />
              : toArray(courses.data).length === 0 ? <Empty message="No purchased courses yet." />
              : toArray(courses.data).map((c, i) => (
                <GatedCard animate={!hasAnimated.current} index={i} key={c.id}>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
                    <IconTile initial={(c.title ?? 'C').charAt(0).toUpperCase()} size={48} variant="dark" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heading}>{c.title}</Text>
                      {c.description ? (
                        <Text style={[styles.muted, { marginTop: 2 }]}>{c.description ?? ''}</Text>
                      ) : null}
                    </View>
                  </View>
                </GatedCard>
              ))}
          </>
        )}
        {section === 'orders' && (
          <>
            <SectionHeader title="My Orders" />
            {orders.loading ? <Loading label="Loading orders…" />
              : orders.error ? <ErrorBox message={orders.error} onRetry={orders.reload} />
              : toArray(orders.data).length === 0 ? <Empty message="No orders yet." />
              : toArray(orders.data).map((o, i) => {
                // Payment lookup is by Cashfree order id (TN-...), which the
                // Order row carries as transaction_id — NOT the numeric row id.
                const paymentOrderId = o.transaction_id ?? String(o.id);
                const key = String(paymentOrderId);
                const live = paymentStatus[key];
                const statusUpper = (o.status ?? '').toUpperCase();
                const statusVariant = statusUpper === 'SUCCESS' ? 'green' : statusUpper === 'PENDING' ? 'amber' : 'danger';
                return (
                  <GatedCard animate={!hasAnimated.current} index={i} key={o.id ?? i}>
                    <Text style={styles.heading}>Order #{o.transaction_id ?? o.id}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <Chip label={`Amount: ${inr(o.amount)}`} variant="default" />
                      {o.status ? <Chip label={statusUpper} variant={statusVariant} /> : null}
                    </View>
                    {o.created_at ? <Text style={[styles.muted, { marginTop: 8 }]}>{o.created_at}</Text> : null}
                    {live?.status ? <Text style={[styles.muted, { fontWeight: '700', marginTop: 6 }]}>Payment status: {live.status}</Text> : null}
                    {live?.error ? <Text style={styles.errorText}>{live.error}</Text> : null}
                    <View style={{ marginTop: 12 }}>
                      <SecondaryButton
                        disabled={live?.busy}
                        label={live?.busy ? 'Checking…' : 'Check Payment Status'}
                        onPress={() => void checkPaymentStatus(paymentOrderId)}
                      />
                    </View>
                  </GatedCard>
                );
              })}
          </>
        )}
        {section === 'notifications' && (
          <>
            <SectionHeader title="Notifications" />
            {notifications.loading ? <Loading label="Loading notifications…" />
              : notifications.error ? <ErrorBox message={notifications.error} onRetry={notifications.reload} />
              : toArray(notifications.data).length === 0 ? <Empty message="No notifications." />
              : toArray(notifications.data).map((n, i) => (
                <GatedCard animate={!hasAnimated.current} index={i} key={n.id ?? i}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <IconTile icon="notifications" size={40} variant="primary" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heading}>{n.title}</Text>
                      <Text style={[styles.muted, { marginTop: 2 }]}>{n.message ?? n.body ?? ''}</Text>
                    </View>
                  </View>
                </GatedCard>
              ))}
          </>
        )}
        {section === 'help' && (
          <>
            <SectionHeader title="Help & Support" />
            <Card>
              <Text style={styles.heading}>Send an enquiry</Text>
              <TextInput
                multiline
                onChangeText={setEnquiry}
                placeholder="How can we help you?"
                style={[styles.input, { marginVertical: 10, minHeight: 90, textAlignVertical: 'top' }]}
                value={enquiry}
              />
              <PrimaryButton disabled={enquiryBusy} label={enquiryBusy ? 'Sending…' : 'Submit Enquiry'} onPress={submitEnquiry} />
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
