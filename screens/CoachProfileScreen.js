import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export default function CoachProfileScreen({ route, navigation }) {
  const { coachId } = route.params;
  const [coach, setCoach] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: coachData } = await supabase
        .from('coaches')
        .select('*, profiles(full_name)')
        .eq('id', coachId)
        .single();
      if (coachData) setCoach(coachData);

      const { data: availData } = await supabase
        .from('availability')
        .select('*, gyms(name)')
        .eq('coach_id', coachId)
        .order('day_of_week')
        .order('start_time');
      if (availData) setAvailability(availData);

      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_client_id_fkey(full_name)')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (reviewData) setReviews(reviewData);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Se încarcă...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const availByDay = DAYS.map((day, index) => ({
    day,
    slots: availability.filter(a => a.day_of_week === index),
  })).filter(d => d.slots.length > 0);

  const initials = coach?.profiles?.full_name
    ? coach.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Înapoi</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{coach?.profiles?.full_name || 'Antrenor'}</Text>
          <Text style={styles.sport}>{coach?.sport_types?.join(', ')}</Text>
          {parseFloat(coach?.rating) > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>⭐ {coach.rating}</Text>
              <Text style={styles.reviewCount}>({coach.review_count} recenzii)</Text>
            </View>
          )}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{coach?.price_per_session} lei / sesiune</Text>
          </View>
        </View>

        {/* Bio */}
        {coach?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despre mine</Text>
            <Text style={styles.bio}>{coach.bio}</Text>
          </View>
        )}

        {/* Program */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program</Text>
          {availByDay.length === 0 ? (
            <Text style={styles.empty}>Antrenorul nu a setat încă un program.</Text>
          ) : (
            availByDay.map(({ day, slots }) => (
              <View key={day} style={styles.dayBlock}>
                <Text style={styles.dayTitle}>{day}</Text>
                {slots.map(slot => (
                  <View key={slot.id} style={styles.slotRow}>
                    <Text style={styles.slotTime}>
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </Text>
                    <View style={styles.slotRight}>
                      <Text style={styles.slotGym}>{slot.gyms?.name}</Text>
                      <Text style={styles.slotType}>
                        {slot.session_type === 'group' ? '👥 Grup' : '👤 One to One'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Recenzii */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recenzii</Text>
            {reviews.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{review.profiles?.full_name || 'Client'}</Text>
                  <Text style={styles.reviewRating}>{'⭐'.repeat(review.rating)}</Text>
                </View>
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Booking', { coachId: coach.id })}
        >
          <Text style={styles.buttonText}>Rezervă o sesiune</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary, fontSize: 15 },
  backBtn: { paddingTop: 16, marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  hero: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  sport: { fontSize: 15, color: colors.textSecondary, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ratingText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  reviewCount: { fontSize: 13, color: colors.textSecondary },
  priceBadge: { backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  priceText: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  bio: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  empty: { color: colors.textSecondary, fontSize: 14 },
  dayBlock: { marginBottom: 12 },
  dayTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  slotTime: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  slotRight: { alignItems: 'flex-end' },
  slotGym: { fontSize: 13, color: colors.textSecondary },
  slotType: { fontSize: 12, color: colors.textSecondary },
  reviewCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  reviewRating: { fontSize: 12 },
  reviewComment: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});