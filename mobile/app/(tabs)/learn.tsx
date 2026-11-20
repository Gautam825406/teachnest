import { Link } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, type } from '../../config/theme';
import { IconTile, PressableCard, styles } from '../../components/ui';
import { PressScale } from '../../components/motion';

const SECTIONS = [
  { key: 'videos', title: 'Recorded Classes', desc: 'YouTube playlist videos from your courses.', icon: 'play-circle' },
  { key: 'notes', title: 'Notes & Docs', desc: 'Class notes and documents (PDF).', icon: 'document-text' },
  { key: 'syllabus', title: 'Syllabus', desc: 'Course syllabus documents.', icon: 'book' },
  { key: 'previous-papers', title: 'Previous Papers', desc: 'Previous year question papers.', icon: 'newspaper' },
  { key: 'ebooks', title: 'E-Books', desc: 'E-books and study material.', icon: 'library' },
] as const;

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

export default function LearnScreen() {
  // Staggered entrance only on first mount — later re-renders don't re-animate.
  const hasAnimated = useRef(false);
  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  return (
    <ScrollView style={{ backgroundColor: theme.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>Learn</Text>
        <Text style={[styles.muted, { marginBottom: 16 }]}>
          Recorded classes, notes, syllabus, papers and e-books — all from the API.
        </Text>
        {SECTIONS.map((s, i) => (
          <Link
            asChild
            href={{ pathname: '/learn/[section]', params: { section: s.key } }}
            key={s.key}
          >
            <GatedCard animate={!hasAnimated.current} index={i}>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
                <IconTile icon={s.icon} size={48} variant="primary" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, ...type.heading }}>{s.title}</Text>
                  <Text style={{ color: theme.muted, ...type.body, marginTop: 2 }}>{s.desc}</Text>
                </View>
                <Ionicons color={theme.muted} name="chevron-forward" size={20} />
              </View>
            </GatedCard>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
