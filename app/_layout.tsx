import 'react-native-gesture-handler';
import { Stack, Redirect, useSegments } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { NewItemSheetProvider } from '@/components/NewItemSheet';
import { MoreSheetProvider } from '@/components/MoreSheet';
import { subscribeAuthChange } from '@/api/auth';

export default function RootLayout() {
  const [status, setStatus] = useState<'loading' | 'auth' | 'unauth'>('loading');
  const routeSegments = useSegments();

  useEffect(() => subscribeAuthChange(setStatus), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const at = await SecureStore.getItemAsync('at');
      const rt = await SecureStore.getItemAsync('rt');
      if (cancelled) return;
      setStatus(at && rt ? 'auth' : 'unauth');
    })();

    return () => {
      cancelled = true;
    };
  }, [routeSegments]);

  if (status === 'loading') return null;

  return (
    <SafeAreaProvider>
      <StatusBar translucent={false} backgroundColor="#fff" barStyle="dark-content" />
      <NewItemSheetProvider>
        <MoreSheetProvider>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            <Stack>
              <Stack.Screen name="landing" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="recording"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen name="upload" options={{ headerShown: false }} />
              <Stack.Screen name="detail" options={{ headerShown: false }} />
              <Stack.Screen name="folder" options={{ headerShown: false }} />
              <Stack.Screen name="pdf" options={{ headerShown: false }} />
              <Stack.Screen name="quiz" options={{ headerShown: false }} />
            </Stack>
            {status === 'unauth' && <Redirect href="/landing" />}
          </SafeAreaView>
        </MoreSheetProvider>
      </NewItemSheetProvider>
    </SafeAreaProvider>
  );
}
