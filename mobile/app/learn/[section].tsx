import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import { Chip, Empty, ErrorBox, IconTile, PressableCard, SkeletonList, styles } from '../../components/ui';
import { PressScale } from '../../components/motion';
import { api, toArray, type ContentItem } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const TITLES: Record<string, string> = {
  videos: 'Recorded Classes',
  notes: 'Notes & Docs',
  syllabus: 'Syllabus',
  'previous-papers': 'Previous Papers',
  ebooks: 'E-Books',
};

/** PressableCard on first mount (staggered entrance); plain card afterwards. */
function GatedCard({
  animate,
  index,
  children,
}: {
  animate: boolean;
  index: number;
  children: ReactNode;
}) {
  if (!animate) {
    return (
      <PressScale>
        <View style={styles.card}>{children}</View>
      </PressScale>
    );
  }
  return <PressableCard index={index}>{children}</PressableCard>;
}

export default function LearnSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const fetcher = () => {
    switch (section) {
      case 'videos': return api.videos();
      case 'notes': return api.notes();
      case 'syllabus': return api.syllabus();
      case 'previous-papers': return api.previousPapers();
      case 'ebooks': return api.ebooks();
      default: return api.videos();
    }
  };
  const { data, error, loading, reload } = useApi(fetcher, [section]);
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background, flex: 1 }]}>
        <Text style={[styles.title, { marginBottom: 12 }]}>{TITLES[section] ?? section}</Text>
        <SkeletonList />
      </View>
    );
  }
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items: ContentItem[] = toArray(data);

  return (
    <View style={{ backgroundColor: theme.background, flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 20 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Empty message={`No ${TITLES[section] ?? 'items'} yet.`} />}
        ListHeaderComponent={
          <Text style={[styles.title, { marginBottom: 12 }]}>{TITLES[section] ?? section}</Text>
        }
        renderItem={({ item, index }) => (
          <GatedCard animate={!hasAnimated.current} index={index}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <IconTile icon={item.video_url ? 'play-circle' : 'document-text'} size={40} variant="primary" />
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>{item.title}</Text>
                {item.description ? (
                  <Text style={[styles.muted, { marginTop: 2 }]}>{item.description}</Text>
                ) : null}
                {item.subject ? (
                  <View style={{ marginTop: 8 }}>
                    <Chip label={item.subject} variant="primary" />
                  </View>
                ) : null}
                {item.video_url || item.url || item.file_url ? (
                  <Text numberOfLines={1} style={[styles.muted, { marginTop: 6 }]}>
                    {item.video_url ?? item.url ?? item.file_url}
                  </Text>
                ) : null}
              </View>
            </View>
          </GatedCard>
        )}
      />
    </View>
  );
}
