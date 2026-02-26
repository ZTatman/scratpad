import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppStore } from '@/store/use-app-store';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  const hydrated = useAppStore((state) => state.hydrated);
  const runReminderTick = useAppStore((state) => state.runReminderTick);

  React.useEffect(() => {
    if (!hydrated) return;
    // Run once on app ready, then every minute to evaluate reminder policy + due tasks.
    runReminderTick();
    const interval = setInterval(() => {
      runReminderTick();
    }, 60_000);
    return () => clearInterval(interval);
  }, [hydrated, runReminderTick]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.cream }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: 'slide_from_right'
        }}
      />
    </GestureHandlerRootView>
  );
}
