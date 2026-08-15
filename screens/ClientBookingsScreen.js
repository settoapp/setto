import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export default function ClientBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  async function loadBookings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const now = new Date();
    const { data: confirmed } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', user.id)
      .eq('status', 'confirmed');

    if (confirmed) {
      for (const booking of confirmed) {
        if (!booking.date || !booking.end_time) continue;
        const endDateTime = new Date(`${booking.date}T${booking.end_time}`);
        const oneHourAfter = new Date(endDateTime.getTime() + 60 * 60 * 1000);
        if (now >= oneHourAfter) {
          await supabase
            .from('bookings')
            .update({ status: 'completed', completed_at: endDateTime.toISOString() })
            .eq('id', booking.id);
        }
      }
    }

    const { data } = await supabase
      .from('bookings')
      .select('*, coaches(price_per_session, profiles(full_name)), gyms(name), reviews!reviews_booking_id_fkey(id)')
      .eq('client_id', user.id)
      .eq('status', filter)
      .order('date', { ascending: true });

    if (data) setBookings(data);
    setLoading(false);
  }

  const filterLabels = {
    pending: 'În așteptare',
    confirmed: 'Confirmate',
    completed: 'Finalizate',
    cancelled: 'Anulate',
  };

  const statusConfig = {
    confirmed: { label: '✓ CONFIRMAT', bg: '#ECFDF5', text: '#065F46' },
    pending: { label: '⏳ ÎN AȘTEPTARE', bg: '#FFFBEB', text: '#92400E' },
    cancelled: { label: '✕ ANULAT', bg: '#FEF2F2', text: '#991B1B' },
    completed: { label: '🏁 FINALIZAT', bg: '#EFF6FF', text: '#1E40AF' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rezervările mele</Text>
        </View>

        {/* Filtre */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {Object.keys(filterLabels).map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.filterBtn, filter === key && styles.filterBtnSelected]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextSelected]}>
                {filterLabels[key]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <Text style={styles.empty}>Se încarcă...</Text>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Nicio rezervare</Text>
            <Text style={styles.emptyDesc}>{filterLabels[filter].toLowerCase()}</Text>
          </View>
        ) : (
          bookings.map(booking => {
            const status = statusConfig[booking.status] || { label: booking.status, bg: colors.surface, text: colors.textPrimary };
            return (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                </View>

                <Text style={styles.coachName}>cu {booking.coaches?.profiles?.full_name || 'Antrenor'}</Text>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{DAYS[booking.day_of_week]}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⏰</Text>
                    <Text style={styles.detailText}>{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText}>{booking.gyms?.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>💰</Text>
                    <Text style={styles.detailText}>{booking.coaches?.price_per_session} lei</Text>
                  </View>
                </View>

                {filter === 'completed' && !booking.reviews && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => navigation.navigate('Review', {
                      bookingId: booking.id,
                      coachId: booking.coach_id,
                      coachName: booking.coaches?.profiles?.full_name || 'Antrenor',
                    })}
                  >
                    <Text style={styles.reviewBtnText}>⭐ Lasă o recenzie</Text>
                  </TouchableOpacity>
                )}

                {filter === 'completed' && booking.reviews && (
                  <TouchableOpacity
                    style={styles.editReviewBtn}
                    onPress={() => navigation.navigate('Review', {
                      bookingId: booking.id,
                      coachId: booking.coach_id,
                      coachName: booking.coaches?.profiles?.full_name || 'Antrenor',
                    })}
                  >
                    <Text style={styles.editReviewBtnText}>✏️ Editează recenzia</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
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
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  filterScroll: { marginBottom: 24 },
  filterBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, backgroundColor: colors.surface },
  filterBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextSelected: { color: '#fff' },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 32 },
  emptyContainer: { alignItems: 'center', marginTop: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  emptyDesc: { fontSize: 14, color: colors.textSecondary },
  bookingCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  coachName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  bookingDetails: { gap: 6, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 14, color: colors.textSecondary },
  reviewBtn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  reviewBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  editReviewBtn: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' },
  editReviewBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});