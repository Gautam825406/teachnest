import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { api, inr } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, reload } = useApi(() => api.course(id));
  const [busy, setBusy] = useState(false);
  const [purchased, setPurchased] = useState(false);

  if (loading) return <Loading label="Loading course…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  if (!data) return <View style={styles.screen}><Empty message="Course not found." /></View>;

  const buy = () => {
    Alert.alert(
      'Demo purchase',
      'Demo purchase — no real payment will be charged. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy Now',
          onPress: async () => {
            setBusy(true);
            try {
              const order = await api.purchaseCourse(id);
              setPurchased(true);
              Alert.alert('Purchase successful', `Order ${order.transaction_id ?? ''} — access granted (demo).`);
            } catch (e) {
              Alert.alert('Purchase failed', e instanceof Error ? e.message : 'Try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
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
        <PrimaryButton disabled={busy || purchased} label={purchased ? 'Purchased — Access Granted' : busy ? 'Processing…' : 'Buy Now'} onPress={buy} />
        <Text style={[styles.muted, { marginTop: 10, textAlign: 'center' }]}>Demo purchase — no real payment.</Text>
      </View>
    </ScrollView>
  );
}
