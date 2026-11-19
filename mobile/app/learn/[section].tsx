import { useLocalSearchParams } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { Card, Empty, ErrorBox, Loading, styles } from '../../components/ui';
import { api, toArray, type ContentItem } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const TITLES: Record<string, string> = {
  videos: 'Recorded Classes',
  notes: 'Notes & Docs',
  syllabus: 'Syllabus',
  'previous-papers': 'Previous Papers',
  ebooks: 'E-Books',
};

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
  if (loading) return <Loading label={`Loading ${TITLES[section] ?? section}…`} />;
  if (error) return <View style={styles.screen}><ErrorBox message={error} onRetry={reload} /></View>;
  const items: ContentItem[] = toArray(data);

  return (
    <View style={{ backgroundColor: '#f8fafc', flex: 1, padding: 16 }}>
      <Text style={[styles.title, { marginBottom: 12 }]}>{TITLES[section] ?? section}</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        ListEmptyComponent={<Empty message={`No ${TITLES[section] ?? 'items'} yet.`} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.heading}>{item.title}</Text>
            {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
            {item.subject ? <Text style={styles.muted}>Subject: {item.subject}</Text> : null}
            {item.video_url || item.url || item.file_url ? (
              <Text style={[styles.muted, { marginTop: 4 }]}>{item.video_url ?? item.url ?? item.file_url}</Text>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}
