import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { supabase } from '../supabase';
import { colors } from '../theme';

export default function ClientProfileSettingsScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [initials, setInitials] = useState('?');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.full_name) {
          setFullName(profile.full_name);
          setInitials(profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase());
        }
        if (profile.phone) setPhone(profile.phone);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      }
      setUserId(user.id);
    }
    load();
  }, []);

  async function handleSave() {
    if (!fullName) {
      Alert.alert('Eroare', 'Numele nu poate fi gol.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      Alert.alert('Eroare', error.message);
    } else {
      Alert.alert('Succes', 'Profilul tău a fost actualizat!');
    }
  }
  function handlePickImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      if (uploadError) {
        Alert.alert('Eroare', uploadError.message);
        setLoading(false);
        return;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      setAvatarUrl(publicUrl);
      setLoading(false);
    };
    input.click();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Înapoi</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profilul meu</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              style={{ width: 88, height: 88, borderRadius: 44, objectFit: 'cover' }}
              alt="avatar"
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage}>
            <Text style={styles.uploadBtnText}>📷 Schimbă poza</Text>
          </TouchableOpacity>
        </View>

        {/* Email (read-only) */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{email}</Text>
        </View>

        {/* Nume */}
        <Text style={styles.label}>Nume complet</Text>
        <TextInput
          style={styles.input}
          placeholder="Numele tău complet"
          placeholderTextColor={colors.textSecondary}
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Telefon */}
        <Text style={styles.label}>Număr de telefon</Text>
        <TextInput
          style={styles.input}
          placeholder="07xx xxx xxx"
          placeholderTextColor={colors.textSecondary}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* Salveaza */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Se salvează...' : 'Salvează modificările'}</Text>
        </TouchableOpacity>

        {/* Schimba parola */}
        <TouchableOpacity
          style={styles.changePasswordBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.changePasswordText}>🔑 Schimbă parola</Text>
        </TouchableOpacity>
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
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 16, color: colors.textPrimary },
  readOnlyInput: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 },
  readOnlyText: { fontSize: 16, color: colors.textSecondary },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonDisabled: { backgroundColor: colors.textSecondary },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  changePasswordBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  changePasswordText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
    uploadBtn: { marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  uploadBtnText: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
});