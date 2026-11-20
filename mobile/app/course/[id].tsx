import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { ApiError, api, inr, type PaymentOrder } from '../../lib/api';
import { openExternalUrl } from '../../lib/openLink';
import { useApi } from '../../lib/useApi';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(() => api.course(id));
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

  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <View style={{ alignItems: 'center', backgroundColor: brand.primaryDark, borderRadius: 12, height: 160, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', padding: 16, textAlign: 'center' }}>{data.title}</Text>
          <Text style={{ color: '#c7d2fe' }}>Course thumbnail</Text>
        </View>
        <Text style={[styles.sectionTitle, { fontSize: 20 }]}>{data.title}</Text>
        <Text style={{ color: brand.primaryColor, fontSize: 18, fontWeight: '700' }}>
          {inr(data.price)} {data.mrp ? <Text style={{ color: brand.muted, fontSize: 14, textDecorationLine: 'line-through' }}>{inr(data.mrp)}</Text> : null}
        </Text>
        {data.validity_days ? <Text style={styles.muted}>Validity: {data.validity_days} days</Text> : null}
        {data.category !== null && data.category !== undefined ? <Text style={styles.muted}>Category: {String(data.category)}</Text> : data.category_id ? <Text style={styles.muted}>Category ID: {data.category_id}</Text> : null}
        <Card>
          <Text style={styles.heading}>About this course</Text>
          <Text style={styles.body}>{data.description ?? 'No description yet.'}</Text>
        </Card>
        {data.teacher_ids?.length ? (
          <Card><Text style={styles.heading}>Teachers</Text><Text style={styles.muted}>Teacher IDs: {data.teacher_ids.join(', ')}</Text></Card>
        ) : null}
        {data.drip_content || data.sequential_learning ? (
          <Card>
            <Text style={styles.muted}>
              {data.drip_content ? 'Drip content enabled. ' : ''}{data.sequential_learning ? 'Sequential learning enabled.' : ''}
            </Text>
          </Card>
        ) : null}
        {order && !purchased ? (
          <Card>
            <Text style={styles.heading}>Order #{String(order.order_id)}</Text>
            <Text style={styles.muted}>Amount: {inr(order.amount_rupees ?? data.price)}</Text>
            <Text style={styles.muted}>Complete the payment on the Cashfree page, then verify it here.</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              <PrimaryButton disabled={verifying} label={verifying ? 'Verifying…' : 'Verify Payment'} onPress={() => void verifyPayment()} />
              {order.payment_link ? (
                <PrimaryButton label="Open Payment Page Again" onPress={() => void openPaymentPage(order.payment_link as string)} />
              ) : null}
            </View>
          </Card>
        ) : null}
        <PrimaryButton disabled={busy || purchased || !!order} label={purchased ? 'Purchased — Access Granted' : busy ? 'Starting payment…' : 'Buy Now'} onPress={buy} />
        {paymentNote ? <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>{paymentNote}</Text> : null}
        <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>Secure payment via Cashfree.</Text>
      </View>
    </ScrollView>
  );
}
