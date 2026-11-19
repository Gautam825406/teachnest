import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, Empty, ErrorBox, Loading, styles } from '../../components/ui';
import { api, inr, toArray } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useApi } from '../../lib/useApi';

export default function HomeScreen() {
  const { student } = useAuth();
  const { data, error, loading, reload } = useApi(() => api.home());

  if (loading) return <Loading label="Loading home…" />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  if (!data) return <View style={styles.screen}><Empty message="No home data yet." /></View>;

  const banners = data.banners ?? [];
  const courses = data.featured_courses ?? [];
  const tests = data.test_series ?? [];
  const affairs = data.current_affairs ?? [];
  const jobs = data.jobs ?? [];
  const toppers = data.toppers ?? [];
  const testimonials = data.testimonials ?? [];

  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Hello, {student?.name ?? 'Student'} 👋</Text>
        <Text style={styles.muted}>Welcome back to {brand.instituteName} — {brand.tagline}</Text>

        {banners.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Announcements</Text>
            {banners.map((b) => (
              <Card key={b.id}><Text style={styles.heading}>{b.title ?? b.name ?? 'Announcement'}</Text></Card>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Featured Courses</Text>
        {courses.length === 0 ? <Empty message="No featured courses yet." /> : courses.map((c) => (
          <Link asChild href={{ pathname: '/course/[id]', params: { id: String(c.id) } }} key={c.id}>
            <Pressable>
              <Card>
                <Text style={styles.heading}>{c.title}</Text>
                <Text style={styles.muted}>{c.description ?? ''}</Text>
                <Text style={{ color: brand.primaryColor, fontWeight: '700', marginTop: 6 }}>
                  {inr(c.price)} {c.mrp ? <Text style={{ color: brand.muted, textDecorationLine: 'line-through' }}>{inr(c.mrp)}</Text> : null}
                </Text>
              </Card>
            </Pressable>
          </Link>
        ))}

        <Text style={styles.sectionTitle}>Test Series</Text>
        {tests.length === 0 ? <Empty message="No test series yet." /> : tests.map((t) => (
          <Link asChild href={{ pathname: '/test/[id]', params: { id: String(t.id) } }} key={t.id}>
            <Pressable><Card><Text style={styles.heading}>{t.title}</Text><Text style={styles.muted}>{t.description ?? ''}</Text></Card></Pressable>
          </Link>
        ))}

        <Text style={styles.sectionTitle}>Current Affairs</Text>
        {affairs.length === 0 ? <Empty message="No current affairs yet." /> : affairs.map((a) => (
          <Card key={a.id}><Text style={styles.heading}>{a.title}</Text>{a.description ? <Text style={styles.muted}>{a.description}</Text> : null}</Card>
        ))}

        <Text style={styles.sectionTitle}>Latest Jobs</Text>
        {jobs.length === 0 ? <Empty message="No jobs posted yet." /> : jobs.map((j) => (
          <Card key={j.id}><Text style={styles.heading}>{j.title}</Text>{j.description ? <Text style={styles.muted}>{j.description}</Text> : null}</Card>
        ))}

        <Text style={styles.sectionTitle}>Toppers</Text>
        {toppers.length === 0 ? <Empty message="No toppers yet." /> : toppers.map((t, i) => (
          <Card key={t.id ?? i}><Text style={styles.heading}>{t.name}</Text>{t.score !== undefined && t.score !== null ? <Text style={styles.muted}>Score: {String(t.score)}</Text> : null}</Card>
        ))}

        <Text style={styles.sectionTitle}>What students say</Text>
        {testimonials.length === 0 ? <Empty message="No testimonials yet." /> : testimonials.map((t, i) => (
          <Card key={t.id ?? i}>
            <Text style={styles.body}>{t.text ?? t.message ?? ''}</Text>
            {t.name ? <Text style={[styles.muted, { marginTop: 6 }]}>— {t.name}</Text> : null}
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
