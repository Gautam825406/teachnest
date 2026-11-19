import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, styles } from '../../components/ui';

const SECTIONS = [
  { key: 'videos', title: 'Recorded Classes', desc: 'YouTube playlist videos from your courses.' },
  { key: 'notes', title: 'Notes & Docs', desc: 'Class notes and documents (PDF).' },
  { key: 'syllabus', title: 'Syllabus', desc: 'Course syllabus documents.' },
  { key: 'previous-papers', title: 'Previous Papers', desc: 'Previous year question papers.' },
  { key: 'ebooks', title: 'E-Books', desc: 'E-books and study material.' },
] as const;

export default function LearnScreen() {
  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.muted}>Recorded classes, notes, syllabus, papers and e-books — all from the API.</Text>
        {SECTIONS.map((s) => (
          <Link asChild href={{ pathname: '/learn/[section]', params: { section: s.key } }} key={s.key}>
            <Pressable>
              <Card>
                <Text style={styles.heading}>{s.title}</Text>
                <Text style={styles.muted}>{s.desc}</Text>
              </Card>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
