import { Link } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { Banner, Empty, ErrorBox, PressableCard, SkeletonList, SectionHeader, styles } from '../../components/ui';
import { PressScale } from '../../components/motion';
import { api, toArray } from '../../lib/api';
import { useApi } from '../../lib/useApi';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatScheduled(value?: string | null): string {
  const d = parseDate(value);
  if (!d) return value ?? '';
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  // Append the time only when the value actually carries one (not midnight).
  if (value && value.includes('T') && (d.getHours() !== 0 || d.getMinutes() !== 0)) {
    return `${date}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date;
}

/** PressableCard on first mount (staggered entrance); plain card afterwards. */
function GatedCard({
  animate,
  index,
  onPress,
  children,
}: {
  animate: boolean;
  index: number;
  onPress?: () => void;
  children: ReactNode;
}) {
  if (!animate) {
    return (
      <PressScale onPress={onPress}>
        <View style={styles.card}>{children}</View>
      </PressScale>
    );
  }
  return (
    <PressableCard index={index} onPress={onPress}>
      {children}
    </PressableCard>
  );
}

export default function LiveScreen() {
  const { data, error, loading, reload } = useApi(() => api.seminars());
  // Live provider config: a failed fetch (e.g. endpoint not deployed yet)
  // means "unconfigured" — the DEMO label stays, the seminars list still loads.
  const liveConfig = useApi(() => api.liveConfig(), []);
  const [refreshing, setRefreshing] = useState(false);
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  const configured = liveConfig.data?.configured === true;
  const provider = liveConfig.data?.provider ?? null;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([reload(), liveConfig.reload()]);
    } finally {
      setRefreshing(false);
    }
  };

  const banner = configured ? (
    <Banner
      body="Tap a class below to join it."
      title={`Live classes are hosted on ${provider ?? 'the institute’s live provider'}.`}
      variant="green"
    />
  ) : (
    <Banner
      body="Seminars below come from the API; joining opens a demo placeholder screen."
      title="DEMO — live video is not connected yet (Phase 4)."
      variant="amber"
    />
  );

  if (loading) {
    return (
      <ScrollView style={{ backgroundColor: theme.background, flex: 1 }}>
        <View style={{ padding: 20 }}>
          {banner}
          <SkeletonList />
        </View>
      </ScrollView>
    );
  }
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items = toArray(data);
  return (
    <ScrollView
      refreshControl={<RefreshControl colors={[theme.primary]} onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        {banner}
        <SectionHeader title="Live Classes & Seminars" />
        {items.length === 0 ? <Empty message="No live classes or seminars scheduled yet." /> : items.map((s, i) => {
          const d = parseDate(s.scheduled_at);
          return (
            <Link asChild href={{ pathname: '/live/[id]', params: { id: String(s.id), title: s.title } }} key={s.id}>
              <GatedCard animate={!hasAnimated.current} index={i}>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  {d ? (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.primarySoft,
                        borderRadius: 12,
                        height: 64,
                        justifyContent: 'center',
                        width: 56,
                      }}
                    >
                      <Text style={{ color: theme.primary, fontSize: 20, fontWeight: '700', lineHeight: 24 }}>
                        {d.getDate()}
                      </Text>
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                        {d.toLocaleDateString('en-GB', { month: 'short' })}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.primarySoft,
                        borderRadius: 12,
                        height: 64,
                        justifyContent: 'center',
                        width: 56,
                      }}
                    >
                      <Ionicons color={theme.primary} name="videocam" size={24} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heading}>{s.title}</Text>
                    {s.description ? (
                      <Text style={[styles.muted, { marginTop: 2 }]}>{s.description}</Text>
                    ) : null}
                    {s.scheduled_at ? (
                      <Text style={[styles.muted, { marginTop: 6 }]}>
                        Scheduled: {formatScheduled(s.scheduled_at)}
                      </Text>
                    ) : null}
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 10 }}>
                      <Text style={{ color: theme.primary, ...type.bodyBold }}>Join Live Class</Text>
                      <Ionicons color={theme.primary} name="arrow-forward" size={16} />
                    </View>
                  </View>
                </View>
              </GatedCard>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}
