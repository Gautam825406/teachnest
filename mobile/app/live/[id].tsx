import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../config/theme';
import { Banner, ErrorBox, Loading, PrimaryButton, styles } from '../../components/ui';
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
    <ScrollView style={{ backgroundColor: theme.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>{title ?? 'Live Class'}</Text>
        <Text style={[styles.muted, { marginTop: 4 }]}>Seminar ID: {id}</Text>
        <View style={{ marginTop: 16 }}>
          {configured ? (
            <>
              <Banner
                body={
                  joinUrl
                    ? 'Tap Join to open the live class.'
                    : 'No join link has been shared for this class yet. Please check back closer to the scheduled time.'
                }
                title={`Live class hosted on ${provider ?? 'the institute’s live provider'}.`}
                variant="green"
              />
              {joinUrl ? (
                <PrimaryButton disabled={joining} label={joining ? 'Opening…' : 'Join Live Class'} onPress={() => void join()} />
              ) : null}
            </>
          ) : (
            <>
              <Banner
                body="When the institute connects a live video provider, this screen will open the live video stream for this class. For now, no video plays here — this is a placeholder so the join flow can be tested end to end."
                title="DEMO — live video is not connected yet (Phase 4)."
                variant="amber"
              />
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.primaryDark,
                  borderRadius: 16,
                  gap: 12,
                  height: 200,
                  justifyContent: 'center',
                }}
              >
                <Ionicons color={theme.white} name="videocam-off" size={48} />
                <Text style={{ color: theme.white, fontSize: 16, fontWeight: '700' }}>Live video placeholder</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
