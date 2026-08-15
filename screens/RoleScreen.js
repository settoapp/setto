import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function RoleScreen({ navigation }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!selected) {
      Alert.alert('Eroare', 'Alege un rol pentru a continua.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, role: selected });
    setLoading(false);
    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      if (selected === 'coach') {
        navigation.navigate('CoachHome');
      } else {
        navigation.navigate('ClientHome');
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Cine ești tu?</Text>
        <Text style={styles.subtitle}>Alege rolul tău în aplicație</Text>

        <TouchableOpacity
          style={[styles.card, selected === 'coach' && styles.cardSelected]}
          onPress={() => setSelected('coach')}
        >
          <View style={[styles.cardIcon, selected === 'coach' && styles.cardIconSelected]}>
            <Text style={styles.cardIconText}>🏋️</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, selected === 'coach' && styles.cardTitleSelected]}>Antrenor</Text>
            <Text style={[styles.cardDesc, selected === 'coach' && styles.cardDescSelected]}>Oferă sesiuni și gestionează rezervările tale</Text>
          </View>
          {selected === 'coach' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, selected === 'client' && styles.cardSelected]}
          onPress={() => setSelected('client')}
        >
          <View style={[styles.cardIcon, selected === 'client' && styles.cardIconSelected]}>
            <Text style={styles.cardIconText}>🙋</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, selected === 'client' && styles.cardTitleSelected]}>Client</Text>
            <Text style={[styles.cardDesc, selected === 'client' && styles.cardDescSelected]}>Găsește antrenori și rezervă sesiuni</Text>
          </View>
          {selected === 'client' && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!selected || loading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selected || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Se salvează...' : 'Continuă'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardSelected: { borderColor: colors.primary, backgroundColor: '#F0FDFA' },
  cardIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardIconSelected: { backgroundColor: colors.accent },
  cardIconText: { fontSize: 26 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardTitleSelected: { color: colors.primaryDark },
  cardDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  cardDescSelected: { color: colors.primary },
  checkmark: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkmarkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});