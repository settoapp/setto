import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, ScrollView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function ReviewScreen({ route, navigation }) {
  const { bookingId, coachId, coachName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    async function loadExisting() {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();
      if (data) {
        setExistingReview(data);
        setRating(data.rating);
        setComment(data.comment || '');
      }
    }
    loadExisting();
  }, []);

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let error;
    if (existingReview) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update({ rating, comment })
        .eq('id', existingReview.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('reviews')
        .insert({ coach_id: coachId, client_id: user.id, booking_id: bookingId, rating, comment });
      error = insertError;
    }

    setLoading(false);

    if (!error) {
      const msg = existingReview ? 'Recenzia ta a fost actualizată!' : 'Recenzia ta a fost trimisă!';
      if (Platform.OS === 'web') {
        window.alert(msg);
        navigation.navigate('ClientBookings');
      } else {
        navigation.navigate('ClientBookings');
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Înapoi</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{existingReview ? 'Editează recenzia' : 'Lasă o recenzie'}</Text>
        <Text style={styles.subtitle}>pentru {coachName}</Text>

        {/* Stele */}
        <View style={styles.starsContainer}>
          <Text style={styles.starsLabel}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starBtn}>
                <Text style={[styles.star, star <= rating && styles.starSelected]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 1 ? 'Slab' : rating === 2 ? 'Acceptabil' : rating === 3 ? 'Bun' : rating === 4 ? 'Foarte bun' : 'Excelent'}
            </Text>
          )}
        </View>

        {/* Comentariu */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Comentariu <Text style={styles.optional}>(opțional)</Text></Text>
          <TextInput
            style={styles.textArea}
            placeholder="Descrie experiența ta cu acest antrenor..."
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || rating === 0) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Se salvează...' : existingReview ? 'Actualizează recenzia' : 'Trimite recenzia'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { paddingTop: 16, marginBottom: 24 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32 },
  starsContainer: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  starsLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 44, color: colors.border },
  starSelected: { color: '#F59E0B' },
  ratingLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 4 },
  commentContainer: { marginBottom: 24 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  optional: { color: colors.textSecondary, fontWeight: '400' },
  textArea: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.textPrimary, height: 130 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: colors.border },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});