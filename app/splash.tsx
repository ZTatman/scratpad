import React from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { colors } from '@/theme/colors';
import { useAppStore } from '@/store/use-app-store';

export default function SplashScreen() {
  const router = useRouter();
  const { hydrate, hydrated, onboardingDone } = useAppStore(
    useShallow((state) => ({
      hydrate: state.hydrate,
      hydrated: state.hydrated,
      onboardingDone: state.onboardingDone
    }))
  );

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      router.replace(onboardingDone ? '/today' : '/onboarding');
    }, 1200);
    return () => clearTimeout(timeout);
  }, [hydrated, onboardingDone, router]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          flex: 1,
          minHeight: 680,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          backgroundColor: colors.cream
        }}
      >
        <Text selectable style={{ fontSize: 70 }}>🐿️</Text>
        <Text selectable style={{ color: colors.forest, fontSize: 46, fontWeight: '900' }}>
          ScratPad
        </Text>
      </View>
    </ScrollView>
  );
}
