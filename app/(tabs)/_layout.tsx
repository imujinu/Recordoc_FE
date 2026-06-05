import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ headerShown: false }} />
      <Tabs.Screen name="my-work" options={{ headerShown: false }} />
      <Tabs.Screen name="graph" options={{ headerShown: false }} />
      <Tabs.Screen name="more" options={{ headerShown: false }} />
    </Tabs>
  );
}
