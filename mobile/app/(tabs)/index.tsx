import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { brand } from '../../config/brand';
import { theme, type } from '../../config/theme';
import {
  Avatar,
  Card,
  Chip,
  Empty,
  ErrorBox,
  IconTile,
  PressableCard,
  SectionHeader,
  SkeletonList,
  styles,
} from '../../components/ui';
import { FadeIn } from '../../components/motion';
import { api, inr, toArray } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useApi } from '../../lib/useApi';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_WIDTH = SCREEN_WIDTH - 40;

export default function HomeScreen() {
  const { student } = useAuth();
  const { data, error, loading, reload } = useApi(() => api.home());
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  // Stagger only on first mount: once flipped, later renders use index 0.
  const hasAnimated = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => {
      hasAnimated.current = true;
    }, 1200);
    return () => clearTimeout(id);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setBannerIndex(index);
  };

  const staggerIndex = (i: number) => (hasAnimated.current ? 0 : i);

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <SkeletonList />
      </View>
    );
  }
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  if (!data) return <View style={styles.screen}><Empty message="No home data yet." /></View>;

  const banners = data.banners ?? [];
  const courses = data.featured_courses ?? [];
  const tests = data.test_series ?? [];
  const affairs = data.current_affairs ?? [];
  const jobs = data.jobs ?? [];
  const toppers = data.toppers ?? [];
  const testimonials = data.testimonials ?? [];
  const studentName = student?.name ?? 'Student';

  return (
    <ScrollView
      refreshControl={<RefreshControl onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.primary} />}
      style={{ backgroundColor: theme.background, flex: 1 }}
    >
      <View style={{ padding: 20 }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          <Avatar name={studentName} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>
              Hello, {studentName}
            </Text>
            <Text style={{ color: theme.muted, ...type.caption, lineHeight: 18 }}>
              Welcome back to {brand.instituteName} — {brand.tagline}
            </Text>
          </View>
          {/* Bell navigates to Profile; Profile opens on its main section
              (no Notifications param — it is not a separate route). No dot:
              this screen does not fetch notifications, so no unread /
              non-empty state can be shown without a new API call. */}
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/(tabs)/profile')}
            style={{
              alignItems: 'center',
              backgroundColor: theme.surface,
              borderColor: theme.border,
              borderRadius: 12,
              borderWidth: 1,
              height: 44,
              justifyContent: 'center',
              width: 44,
            }}
          >
            <Ionicons color={theme.muted} name="notifications-outline" size={22} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/courses')}
          style={{
            alignItems: 'center',
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderRadius: 12,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 10,
            height: 48,
            marginTop: 16,
            paddingHorizontal: 14,
          }}
        >
          <Ionicons color={theme.muted} name="search" size={20} />
          <Text style={{ color: theme.muted, ...type.body }}>Search courses…</Text>
        </Pressable>

        {banners.length > 0 ? (
          <>
            <SectionHeader title="Announcements" />
            <ScrollView
              horizontal
              onMomentumScrollEnd={onBannerScroll}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {banners.map((b) => (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: theme.primaryDark,
                    borderRadius: 16,
                    flexDirection: 'row',
                    gap: 12,
                    marginRight: 12,
                    padding: 16,
                    width: CAROUSEL_WIDTH,
                  }}
                >
                  <Ionicons color={theme.accent} name="megaphone" size={24} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.white, ...type.heading }}>
                      {b.title ?? b.name ?? 'Announcement'}
                    </Text>
                    <View
                      style={{
                        backgroundColor: theme.accent,
                        borderRadius: 2,
                        height: 4,
                        marginTop: 10,
                        width: 48,
                      }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 10 }}>
              {banners.map((b, i) => (
                <View
                  key={b.id}
                  style={{
                    backgroundColor: i === bannerIndex ? theme.primary : theme.border,
                    borderRadius: 4,
                    height: 8,
                    width: i === bannerIndex ? 20 : 8,
                  }}
                />
              ))}
            </View>
          </>
        ) : null}

        <SectionHeader
          actionLabel="See all"
          onAction={() => router.push('/(tabs)/courses')}
          title="Featured Courses"
        />
        {courses.length === 0 ? (
          <Empty message="No featured courses yet." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {courses.map((c, i) => (
              <PressableCard
                index={staggerIndex(i)}
                key={c.id}
                onPress={() => router.push({ params: { id: String(c.id) }, pathname: '/course/[id]' })}
                style={{ marginBottom: 0, marginRight: 12, width: 240 }}
              >
                <IconTile initial={(c.title ?? 'C')[0]!.toUpperCase()} size={48} variant="dark" />
                <Text numberOfLines={2} style={[styles.heading, { marginTop: 10 }]}>
                  {c.title}
                </Text>
                <Text numberOfLines={2} style={[styles.muted, { marginTop: 4 }]}>
                  {c.description ?? ''}
                </Text>
                <Text style={{ color: theme.primary, marginTop: 8, ...type.body, fontWeight: '700' }}>
                  {inr(c.price)}{' '}
                  {c.mrp ? (
                    <Text style={{ color: theme.muted, textDecorationLine: 'line-through' }}>
                      {inr(c.mrp)}
                    </Text>
                  ) : null}
                </Text>
              </PressableCard>
            ))}
          </ScrollView>
        )}

        <SectionHeader
          actionLabel="See all"
          onAction={() => router.push('/(tabs)/tests')}
          title="Test Series"
        />
        {tests.length === 0 ? (
          <Empty message="No test series yet." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tests.map((t, i) => (
              <PressableCard
                index={staggerIndex(i)}
                key={t.id}
                onPress={() => router.push({ params: { id: String(t.id) }, pathname: '/test/[id]' })}
                style={{ marginBottom: 0, marginRight: 12, width: 240 }}
              >
                <IconTile icon="clipboard" size={48} variant="primary" />
                <Text numberOfLines={2} style={[styles.heading, { marginTop: 10 }]}>
                  {t.title}
                </Text>
                <Text numberOfLines={2} style={[styles.muted, { marginTop: 4 }]}>
                  {t.description ?? ''}
                </Text>
              </PressableCard>
            ))}
          </ScrollView>
        )}

        <SectionHeader title="Current Affairs" />
        {affairs.length === 0 ? (
          <Empty message="No current affairs yet." />
        ) : (
          affairs.map((a, i) => (
            <FadeIn delay={hasAnimated.current ? 0 : Math.min(i, 8) * 40} key={a.id}>
              <Card>
                <Text style={styles.heading}>{a.title}</Text>
                {a.description ? <Text style={[styles.muted, { marginTop: 4 }]}>{a.description}</Text> : null}
              </Card>
            </FadeIn>
          ))
        )}

        <SectionHeader title="Latest Jobs" />
        {jobs.length === 0 ? (
          <Empty message="No jobs posted yet." />
        ) : (
          jobs.map((j, i) => (
            <FadeIn delay={hasAnimated.current ? 0 : Math.min(i, 8) * 40} key={j.id}>
              <Card>
                <Text style={styles.heading}>{j.title}</Text>
                {j.description ? <Text style={[styles.muted, { marginTop: 4 }]}>{j.description}</Text> : null}
              </Card>
            </FadeIn>
          ))
        )}

        <SectionHeader title="Toppers" />
        {toppers.length === 0 ? (
          <Empty message="No toppers yet." />
        ) : (
          toppers.map((t, i) => {
            const rank = i + 1;
            const badgeBg =
              rank === 1 ? theme.accent : rank === 2 ? theme.tabInactive : rank === 3 ? theme.accentSoftText : theme.primarySoft;
            const badgeFg = rank <= 3 ? theme.white : theme.primary;
            return (
              <FadeIn delay={hasAnimated.current ? 0 : Math.min(i, 8) * 40} key={t.id ?? i}>
                <Card>
                  <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: badgeBg,
                        borderRadius: 20,
                        height: 40,
                        justifyContent: 'center',
                        width: 40,
                      }}
                    >
                      <Text style={{ color: badgeFg, fontSize: 15, fontWeight: '800' }}>{rank}</Text>
                    </View>
                    <Text style={[styles.heading, { flex: 1 }]}>{t.name}</Text>
                    {t.score !== undefined && t.score !== null ? (
                      <Chip label={`Score: ${String(t.score)}`} variant="primary" />
                    ) : null}
                  </View>
                </Card>
              </FadeIn>
            );
          })
        )}

        <SectionHeader title="What students say" />
        {testimonials.length === 0 ? (
          <Empty message="No testimonials yet." />
        ) : (
          testimonials.map((t, i) => (
            <FadeIn delay={hasAnimated.current ? 0 : Math.min(i, 8) * 40} key={t.id ?? i}>
              <Card>
                <Text style={{ color: theme.primary, fontSize: 28, fontWeight: '800', lineHeight: 28 }}>
                  &ldquo;
                </Text>
                <Text style={[styles.body, { fontStyle: 'italic' }]}>{t.text ?? t.message ?? ''}</Text>
                {t.name ? <Text style={[styles.muted, { marginTop: 6 }]}>— {t.name}</Text> : null}
              </Card>
            </FadeIn>
          ))
        )}
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
