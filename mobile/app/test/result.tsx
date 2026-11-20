import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { theme } from '../../config/theme';
import { Card, Chip, PrimaryButton, ProgressBar, styles } from '../../components/ui';

export default function TestResultScreen() {
  const { score, total, correct, questions, title } = useLocalSearchParams<{
    score: string; total: string; correct: string; questions: string; title: string;
  }>();
  const scoreNum = Number(score);
  const totalNum = Number(total);
  return (
    <ScrollView style={{ backgroundColor: theme.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={[styles.title, { textAlign: 'center' }]}>Test Result</Text>
        <Text style={[styles.muted, { marginTop: 4, textAlign: 'center' }]}>{title ?? ''}</Text>
        <Card style={{ alignItems: 'center', marginTop: 20, paddingVertical: 28 }}>
          {/* 160px score ring */}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.primarySoft,
              borderRadius: 80,
              height: 160,
              justifyContent: 'center',
              width: 160,
            }}
          >
            <Text
              style={{
                color: theme.primary,
                fontSize: 36,
                fontVariant: ['tabular-nums'],
                fontWeight: '800',
                lineHeight: 44,
                textAlign: 'center',
              }}
            >
              {score}
            </Text>
            <Text style={[styles.muted, { textAlign: 'center' }]}>out of {total}</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            <Chip label={`Correct: ${correct} of ${questions}`} variant="primary" />
          </View>
          <View style={{ marginTop: 20, width: '100%' }}>
            <ProgressBar
              color={theme.accent}
              total={Number.isNaN(totalNum) ? 0 : totalNum}
              value={Number.isNaN(scoreNum) ? 0 : scoreNum}
            />
          </View>
        </Card>
        <PrimaryButton label="Back to Tests" onPress={() => router.replace('/(tabs)/tests')} />
      </View>
    </ScrollView>
  );
}
