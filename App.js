import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './supabase';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ClientHomeScreen from './screens/ClientHomeScreen';
import ClientBookingsScreen from './screens/ClientBookingsScreen';
import CoachListScreen from './screens/CoachListScreen';
import CoachProfileScreen from './screens/CoachProfileScreen';
import BookingScreen from './screens/BookingScreen';
import ReviewScreen from './screens/ReviewScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import { colors } from './theme';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://setto.ro', 'https://www.setto.ro', 'https://setto-one.vercel.app', 'http://localhost:8081'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ClientHome: 'acasa',
      ClientBookings: 'rezervari',
      CoachList: 'antrenori',
      CoachProfile: 'antrenor/:coachId',
      Booking: 'rezerva/:coachId',
      Review: 'recenzie/:bookingId',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
    },
  },
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role === 'client') {
          setInitialRoute('ClientHome');
        } else {
          await supabase.auth.signOut();
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
      setLoading(false);
    }
    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ClientHome" component={ClientHomeScreen} />
        <Stack.Screen name="ClientBookings" component={ClientBookingsScreen} />
        <Stack.Screen name="CoachList" component={CoachListScreen} />
        <Stack.Screen name="CoachProfile" component={CoachProfileScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}