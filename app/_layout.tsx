import 'react-native-gesture-handler';
import { Stack, Redirect, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { getToken } from '@/api/auth';

export default function RootLayout() {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const routeSegments = useSegments();

  useEffect(() => {
    (async () => {
      const at = await getToken('at');
      const rt = await getToken('rt');
      setStatus(at && rt ? 'auth' : 'unauth');
    })();
  }, [routeSegments]);

  if (status === 'loading') return null;

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recording"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail"
          options={{ headerShown: false }}
        />
      </Stack>
      {status === 'unauth' && <Redirect href="/landing" />}
    </SafeAreaProvider>
  );
}
