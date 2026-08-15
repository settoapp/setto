import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

const DAYS_SHORT = ['Lu.', 'Ma.', 'Mi.', 'Jo.', 'Vi.', 'Sâ.', 'Du.'];
const MONTHS = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function getWeekDates(weekOffset) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const [startH, startM] = startTime.slice(0, 5).split(':').map(Number);
  const [endH, endM] = endTime.slice(0, 5).split(':').map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  while (current + durationMinutes <= end) {
    const slotStart = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
    const slotEnd = `${String(Math.floor((current + durationMinutes) / 60)).padStart(2, '0')}:${String((current + durationMinutes) % 60).padStart(2, '0')}`;
    slots.push({ slotStart, slotEnd });
    current += durationMinutes;
  }
  return slots;
}

export default function BookingScreen({ route, navigation }) {
  const { coachId } = route.params;
  const [coach, setCoach] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAvail, setSelectedAvail] = useState(null);
  const [loading, setLoading] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${weekDates[0].getDate()}-${weekDates[6].getDate()} ${MONTHS[weekDates[6].getMonth()]}`;

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

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('date, start_time, end_time')
        .eq('coach_id', coachId)
        .in('status', ['pending', 'confirmed']);
      if (bookingsData) setBookedSlots(bookingsData);
    }
    load();
  }, []);

  function getAvailForDate(date) {
    const dayOfWeek = (date.getDay() + 6) % 7;
    return availability.filter(a => a.day_of_week === dayOfWeek);
  }

  function isDateAvailable(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    return getAvailForDate(date).length > 0;
  }

  function isSlotBooked(date, slotStart) {
    const dateStr = date.toISOString().split('T')[0];
    return bookedSlots.some(b => b.date === dateStr && b.start_time.slice(0, 5) === slotStart);
  }

  function getAvailableSlots(date) {
    const avails = getAvailForDate(date);
    const slots = [];
    for (const avail of avails) {
      const generated = generateSlots(avail.start_time, avail.end_time, avail.duration_minutes);
      for (const slot of generated) {
        if (!isSlotBooked(date, slot.slotStart)) {
          slots.push({ ...slot, avail });
        }
      }
    }
    return slots.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }

  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  async function handleBooking() {
    if (!selectedDate || !selectedSlot) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('coach_id', coachId)
      .eq('date', selectedDate.toISOString().split('T')[0])
      .eq('start_time', selectedSlot.slotStart)
      .eq('client_id', user.id)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      if (Platform.OS === 'web') window.alert('Ai deja o rezervare pentru acest interval.');
      return;
    }

    const { error } = await supabase.from('bookings').insert({
      client_id: user.id,
      coach_id: coachId,
      gym_id: selectedSlot.avail.gym_id,
      day_of_week: (selectedDate.getDay() + 6) % 7,
      start_time: selectedSlot.slotStart,
      end_time: selectedSlot.slotEnd,
      status: 'pending',
      date: selectedDate.toISOString().split('T')[0],
    });

    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') window.alert('Eroare: ' + error.message);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Rezervarea ta a fost trimisă antrenorului! 🎉');
        navigation.navigate('ClientHome');
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
        <Text style={styles.title}>Alege ora</Text>
        {coach && <Text style={styles.subtitle}>cu {coach.profiles?.full_name}</Text>}

        {/* Navigare săptămână */}
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => { setWeekOffset(w => w - 1); setSelectedDate(null); setSelectedSlot(null); }}
            disabled={weekOffset === 0}
          >
            <Text style={[styles.navBtn, weekOffset === 0 && styles.navBtnDisabled]}>←</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => { setWeekOffset(w => w + 1); setSelectedDate(null); setSelectedSlot(null); }}>
            <Text style={styles.navBtn}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Zile */}
        <View style={styles.daysRow}>
          {weekDates.map((date, index) => {
            const available = isDateAvailable(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={styles.dayCol}
                onPress={() => { if (available) { setSelectedDate(date); setSelectedSlot(null); } }}
                disabled={!available}
              >
                <Text style={[styles.dayName, !available && styles.dayDisabled]}>{DAYS_SHORT[index]}</Text>
                <View style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSelected && styles.dayCircleToday,
                  !available && styles.dayCircleDisabled,
                ]}>
                  <Text style={[
                    styles.dayNum,
                    isSelected && styles.dayNumSelected,
                    !available && styles.dayNumDisabled,
                  ]}>{date.getDate()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ore disponibile */}
        {selectedDate && (
          <>
            <Text style={styles.slotsTitle}>
              Ore disponibile — <Text style={styles.slotsTitleDate}>{selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}.</Text>
            </Text>
            {availableSlots.length === 0 ? (
              <Text style={styles.empty}>Nu există ore disponibile pentru această zi.</Text>
            ) : (
              availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.slotRow, selectedSlot?.slotStart === slot.slotStart && styles.slotRowSelected]}
                  onPress={() => { setSelectedSlot(slot); setSelectedAvail(slot.avail); }}
                >
                  <Text style={[styles.slotTime, selectedSlot?.slotStart === slot.slotStart && styles.slotTimeSelected]}>
                    {slot.slotStart}
                  </Text>
                  <View style={styles.slotRight}>
                    <Text style={[styles.slotPrice, selectedSlot?.slotStart === slot.slotStart && styles.slotPriceSelected]}>
                      {coach?.price_per_session} lei
                    </Text>
                    <Text style={styles.slotArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* Rezumat */}
        {selectedSlot && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Rezumat rezervare</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>📅</Text>
              <Text style={styles.summaryText}>{selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>⏰</Text>
              <Text style={styles.summaryText}>{selectedSlot.slotStart} - {selectedSlot.slotEnd}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>📍</Text>
              <Text style={styles.summaryText}>{selectedSlot.avail?.gyms?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryIcon}>💰</Text>
              <Text style={styles.summaryText}>{coach?.price_per_session} lei</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleBooking}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Se trimite...' : 'Confirmă rezervarea'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  backBtn: { paddingTop: 16, marginBottom: 16 },
  backText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { fontSize: 22, color: colors.primary, paddingHorizontal: 8 },
  navBtnDisabled: { color: colors.border },
  weekLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  dayCol: { alignItems: 'center', flex: 1 },
  dayName: { fontSize: 11, color: colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  dayDisabled: { color: colors.border },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { borderWidth: 2, borderColor: colors.primary },
  dayCircleDisabled: { backgroundColor: 'transparent' },
  dayNum: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  dayNumSelected: { color: '#fff' },
  dayNumDisabled: { color: colors.border },
  slotsTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  slotsTitleDate: { color: colors.primary },
  empty: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 16 },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  slotRowSelected: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0, marginBottom: 4 },
  slotTime: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  slotTimeSelected: { color: colors.primary },
  slotRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotPrice: { fontSize: 15, color: colors.textSecondary },
  slotPriceSelected: { color: colors.primary },
  slotArrow: { fontSize: 20, color: colors.textSecondary },
  summary: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  summaryIcon: { fontSize: 16 },
  summaryText: { fontSize: 15, color: colors.textPrimary },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});