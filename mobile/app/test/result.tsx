import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, PrimaryButton, styles } from '../../components/ui';

export default function TestResultScreen() {
  const { score, total, correct, questions, title } = useLocalSearchParams<{
    score: string; total: string; correct: string; questions: string; title: string;
  }>();
  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>Test Result</Text>
        <Text style={styles.muted}>{title ?? ''}</Text>
        <Card>
          <Text style={{ color: brand.primaryColor, fontSize: 36, fontWeight: '800', textAlign: 'center' }}>
            {score} / {total}
          </Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>
            Correct: {correct} out of {questions} questions
          </Text>
        </Card>
        <PrimaryButton label="Back to Tests" onPress={() => router.replace('/(tabs)/tests')} />
      </View>
    </ScrollView>
  );
}
