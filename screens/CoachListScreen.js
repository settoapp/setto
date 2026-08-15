import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const SPORTS = ['Toate', 'Fitness', 'Yoga', 'Box', 'Crossfit', 'Înot', 'Tenis', 'Fotbal', 'Baschet', 'Cycling', 'Pilates'];

export default function CoachListScreen({ navigation }) {
  const [coaches, setCoaches] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [selectedSport, setSelectedSport] = useState('Toate');
  const [selectedGym, setSelectedGym] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: gymData } = await supabase.from('gyms').select('*').order('name');
      if (gymData) setGyms(gymData);
      await loadCoaches();
    }
    load();
  }, []);

  async function loadCoaches() {
    setLoading(true);
    const { data } = await supabase
      .from('coaches')
      .select('*, profiles(full_name), rating, review_count');
    setLoading(false);
    if (data) setCoaches(data);
  }

  async function handleFilter() {
    setLoading(true);
    let coachIds = null;
    if (selectedGym) {
      const { data: availData } = await supabase
        .from('availability')
        .select('coach_id')
        .eq('gym_id', selectedGym);
      if (availData) coachIds = [...new Set(availData.map(a => a.coach_id))];
    }
    let query = supabase.from('coaches').select('*, profiles(full_name), rating, review_count');
    if (coachIds) query = query.in('id', coachIds);
    if (selectedSport !== 'Toate') query = query.contains('sport_types', [selectedSport]);
    const { data } = await query;
    setLoading(false);
    if (data) setCoaches(data);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Antrenori</Text>
          <Text style={styles.subtitle}>Găsește antrenorul potrivit</Text>
        </View>

        {/* Filtru sport */}
        <Text style={styles.filterLabel}>Sport</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          {SPORTS.map(sport => (
            <TouchableOpacity
              key={sport}
              style={[styles.chip, selectedSport === sport && styles.chipSelected]}
              onPress={() => setSelectedSport(sport)}
            >
              <Text style={[styles.chipText, selectedSport === sport && styles.chipTextSelected]}>{sport}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtru sală */}
        <Text style={styles.filterLabel}>Sală</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, selectedGym === null && styles.chipSelected]}
            onPress={() => setSelectedGym(null)}
          >
            <Text style={[styles.chipText, selectedGym === null && styles.chipTextSelected]}>Toate</Text>
          </TouchableOpacity>
          {gyms.map(gym => (
            <TouchableOpacity
              key={gym.id}
              style={[styles.chip, selectedGym === gym.id && styles.chipSelected]}
              onPress={() => setSelectedGym(gym.id)}
            >
              <Text style={[styles.chipText, selectedGym === gym.id && styles.chipTextSelected]}>{gym.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.searchBtn} onPress={handleFilter}>
          <Text style={styles.searchBtnText}>Caută antrenori</Text>
        </TouchableOpacity>

        {/* Lista */}
        {loading ? (
          <Text style={styles.empty}>Se încarcă...</Text>
        ) : coaches.length === 0 ? (
          <Text style={styles.empty}>Niciun antrenor găsit.</Text>
        ) : (
          coaches.map(coach => (
            <TouchableOpacity
              key={coach.id}
              style={styles.coachCard}
              onPress={() => navigation.navigate('CoachProfile', { coachId: coach.id })}
            >
              <View style={styles.coachAvatar}>
                <Text style={styles.coachAvatarText}>
                  {coach.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{coach.profiles?.full_name || 'Antrenor'}</Text>
                {parseFloat(coach.rating) > 0 && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.ratingText}>⭐ {String(coach.rating)}</Text>
                    <Text style={styles.reviewCount}>({String(coach.review_count)} recenzii)</Text>
                  </View>
                )}
                <Text style={styles.coachSport}>{coach.sport_types?.join(', ')}</Text>
                <Text style={styles.coachPrice}>{coach.price_per_session} lei / sesiune</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 16 },
  chipsRow: { marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  searchBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginBottom: 24 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 32 },
  coachCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  coachAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  coachAvatarText: { fontSize: 22, fontWeight: '700', color: colors.primaryDark },
  coachInfo: { flex: 1 },
  coachName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  ratingText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  reviewCount: { fontSize: 12, color: colors.textSecondary },
  coachSport: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  coachPrice: { fontSize: 13, fontWeight: '600', color: colors.primary },
  arrow: { fontSize: 22, color: colors.textSecondary },
});