import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

export function EmptyState() {
  return (
    <View
      style={{
        backgroundColor: '#F5F3EE',
        borderRadius: 22,
        padding: 18,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E8E2D6'
      }}
    >
      <Text selectable allowFontScaling={false} style={{ fontSize: 34, opacity: 0.85 }}>
        🐿️
      </Text>
      <Text selectable allowFontScaling={false} style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
        No open tasks for today.
      </Text>
      <Text selectable allowFontScaling={false} style={{ color: '#7E8378', textAlign: 'center', fontSize: 13 }}>
        Scrat is confused. Add one acorn and get momentum going.
      </Text>
    </View>
  );
}
