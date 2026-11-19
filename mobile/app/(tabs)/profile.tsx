import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { brand } from '../../config/brand';
import { API_URL, api, inr, toArray } from '../../lib/api';
import { Card, Empty, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { useAuth } from '../../lib/AuthContext';
import { useApi } from '../../lib/useApi';

export default function ProfileScreen() {
  const { student, logout } = useAuth();
  const [section, setSection] = useState<'main' | 'courses' | 'orders' | 'notifications' | 'help'>('main');
  const [enquiry, setEnquiry] = useState('');
  const [enquiryBusy, setEnquiryBusy] = useState(false);

  const courses = useApi(() => api.myCourses(), []);
  const orders = useApi(() => api.myOrders(), []);
  const notifications = useApi(() => api.notifications(), []);

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

  const menu = (label: string, target: typeof section) => (
    <PrimaryButton key={label} label={label} onPress={() => setSection(target)} />
  );

  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>{student?.name ?? 'My Profile'}</Text>
        <Text style={styles.muted}>{student?.phone ? `+91 ${student.phone}` : ''}</Text>
        {student?.email ? <Text style={styles.muted}>{student.email}</Text> : null}
        {student?.city || student?.state ? <Text style={styles.muted}>{[student.city, student.state].filter(Boolean).join(', ')}</Text> : null}

        {section === 'main' ? (
          <View style={{ gap: 10, marginTop: 16 }}>
            {menu('My Courses', 'courses')}
            {menu('My Orders', 'orders')}
            {menu('Notifications', 'notifications')}
            {menu('Help & Support', 'help')}
            <Card>
              <Text style={styles.heading}>Settings</Text>
              <Text style={styles.muted}>API URL: {API_URL}</Text>
              <Text style={styles.muted}>Institute: {brand.instituteName} ({brand.orgCode})</Text>
              <Text style={styles.muted}>Theme: primary {brand.primaryColor}, accent {brand.accentColor}</Text>
              <Text style={styles.muted}>App: {brand.appName} v3.0.0 (Phase 3)</Text>
            </Card>
            <PrimaryButton label="Log Out" onPress={doLogout} />
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <PrimaryButton label="← Back to Profile" onPress={() => setSection('main')} />
          </View>
        )}

        {section === 'courses' && (
          <>
            <Text style={styles.sectionTitle}>My Courses</Text>
            {courses.loading ? <Loading label="Loading my courses…" />
              : courses.error ? <ErrorBox message={courses.error} onRetry={courses.reload} />
              : toArray(courses.data).length === 0 ? <Empty message="No purchased courses yet." />
              : toArray(courses.data).map((c) => (
                <Card key={c.id}><Text style={styles.heading}>{c.title}</Text><Text style={styles.muted}>{c.description ?? ''}</Text></Card>
              ))}
          </>
        )}
        {section === 'orders' && (
          <>
            <Text style={styles.sectionTitle}>My Orders</Text>
            {orders.loading ? <Loading label="Loading orders…" />
              : orders.error ? <ErrorBox message={orders.error} onRetry={orders.reload} />
              : toArray(orders.data).length === 0 ? <Empty message="No orders yet." />
              : toArray(orders.data).map((o, i) => (
                <Card key={o.id ?? i}>
                  <Text style={styles.heading}>Order #{o.transaction_id ?? o.id}</Text>
                  <Text style={styles.muted}>Amount: {inr(o.amount)} • Status: {o.status ?? '—'}</Text>
                  {o.created_at ? <Text style={styles.muted}>{o.created_at}</Text> : null}
                </Card>
              ))}
          </>
        )}
        {section === 'notifications' && (
          <>
            <Text style={styles.sectionTitle}>Notifications</Text>
            {notifications.loading ? <Loading label="Loading notifications…" />
              : notifications.error ? <ErrorBox message={notifications.error} onRetry={notifications.reload} />
              : toArray(notifications.data).length === 0 ? <Empty message="No notifications." />
              : toArray(notifications.data).map((n, i) => (
                <Card key={n.id ?? i}>
                  <Text style={styles.heading}>{n.title}</Text>
                  <Text style={styles.muted}>{n.message ?? n.body ?? ''}</Text>
                </Card>
              ))}
          </>
        )}
        {section === 'help' && (
          <>
            <Text style={styles.sectionTitle}>Help & Support</Text>
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
