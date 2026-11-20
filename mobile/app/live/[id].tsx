import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
import { api, toArray } from '../../lib/api';
import { openExternalUrl } from '../../lib/openLink';
import { useApi } from '../../lib/useApi';

export default function JoinLiveScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  // A failed config fetch (e.g. endpoint not deployed yet) means "unconfigured".
  const liveConfig = useApi(() => api.liveConfig(), []);
  const seminars = useApi(() => api.seminars(), []);
  const [joining, setJoining] = useState(false);

  const configured = liveConfig.data?.configured === true;
  const provider = liveConfig.data?.provider ?? null;
  // Join URL comes only from the backend seminar record — never invented here.
  const seminar = toArray(seminars.data).find((s) => String(s.id) === String(id));
  const joinUrl = seminar?.join_url ?? null;

  const join = async () => {
    if (!joinUrl) return;
    setJoining(true);
    try {
      await openExternalUrl(joinUrl);
    } catch {
      Alert.alert('Could not open the live class', 'Check your connection and try again.');
    } finally {
      setJoining(false);
    }
  };

  if (seminars.loading) return <Loading label="Loading live class…" />;
  if (seminars.error) return <View style={styles.screen}><ErrorBox message={seminars.error} onRetry={seminars.reload} /></View>;

  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>{title ?? 'Live Class'}</Text>
        <Text style={styles.muted}>Seminar ID: {id}</Text>
        {configured ? (
          <Card>
            <Text style={{ color: '#166534', fontWeight: '700' }}>
              Live class hosted on {provider ?? 'the institute\u2019s live provider'}.
            </Text>
            {joinUrl ? (
              <>
                <Text style={[styles.body, { marginTop: 8 }]}>
                  Tap Join to open the live class.
                </Text>
                <View style={{ marginTop: 12 }}>
                  <PrimaryButton disabled={joining} label={joining ? 'Opening…' : 'Join Live Class'} onPress={() => void join()} />
                </View>
              </>
            ) : (
              <Text style={[styles.body, { marginTop: 8 }]}>
                No join link has been shared for this class yet. Please check back closer to the scheduled time.
              </Text>
            )}
          </Card>
        ) : (
          <Card>
            <Text style={{ color: '#92400e', fontWeight: '700' }}>DEMO — live video is not connected yet (Phase 4).</Text>
            <Text style={styles.body}>
              When the institute connects a live video provider, this screen will open the live video stream for this class.
              For now, no video plays here — this is a placeholder so the join flow can be tested end to end.
            </Text>
          </Card>
        )}
        {!configured ? (
          <View style={{ alignItems: 'center', backgroundColor: brand.primaryDark, borderRadius: 12, height: 200, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Live video placeholder</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
