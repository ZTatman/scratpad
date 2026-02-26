import React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { useAppStore } from '@/store/use-app-store';

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingDone = useAppStore((state) => state.markOnboardingDone);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          minHeight: 760,
          paddingHorizontal: 24,
          paddingVertical: 20,
          justifyContent: 'space-between',
          backgroundColor: colors.cream
        }}
      >
        <View style={{ gap: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 240,
                height: 320,
                borderRadius: 36,
                backgroundColor: '#F2F0EA',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text selectable style={{ fontSize: 80 }}>📩</Text>
            </View>
          </View>

          <Text selectable style={{ color: colors.forest, fontWeight: '900', fontSize: 44, textAlign: 'center' }}>
            Stop chasing,{"\n"}start catching.
          </Text>

          <Text selectable style={{ color: '#6A725F', fontSize: 20, textAlign: 'center', lineHeight: 28 }}>
            ScratPad keeps you on lock-screen action via SMS so you do the work, not app-wander.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={async () => {
              await markOnboardingDone();
              router.replace('/today');
            }}
            style={{
              backgroundColor: colors.forest,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center'
            }}
          >
            <Text selectable style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>
              Get Started
            </Text>
          </Pressable>

          <Text selectable style={{ color: '#8A8F85', textAlign: 'center' }}>
            No account required.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
