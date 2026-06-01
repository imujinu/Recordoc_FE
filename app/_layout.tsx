import 'react-native-gesture-handler';
import { Stack, Redirect, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export default function RootLayout() {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const routeSegments = useSegments();

  useEffect(() => {
    (async () => {
      const at = await SecureStore.getItemAsync('at');
      const rt = await SecureStore.getItemAsync('rt');
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
