import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { brand } from '../../config/brand';
import { Card, styles } from '../../components/ui';

export default function JoinLiveScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  return (
    <ScrollView style={{ backgroundColor: brand.background, flex: 1 }}>
      <View style={{ padding: 20 }}>
        <Text style={styles.title}>{title ?? 'Live Class'}</Text>
        <Text style={styles.muted}>Seminar ID: {id}</Text>
        <Card>
          <Text style={{ color: '#92400e', fontWeight: '700' }}>DEMO — live video is not connected yet (Phase 4).</Text>
          <Text style={styles.body}>
            In Phase 4 this screen will embed the live video stream (100ms / Agora) for this class.
            For now, no video plays here — this is a placeholder so the join flow can be tested end to end.
          </Text>
        </Card>
        <View style={{ alignItems: 'center', backgroundColor: brand.primaryDark, borderRadius: 12, height: 200, justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Live video placeholder</Text>
        </View>
      </View>
    </ScrollView>
  );
}
