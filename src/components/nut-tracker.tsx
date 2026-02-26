import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/theme/colors';

type NutTrackerProps = {
  percent: number;
};

export function NutTracker({ percent }: NutTrackerProps) {
  const safe = Math.max(0, Math.min(100, percent));
  const nuts = safe >= 90 ? '🥜🥜🥜' : safe >= 60 ? '🥜🥜' : safe >= 30 ? '🥜' : '';

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text selectable allowFontScaling={false} style={{ color: '#8F8A80', fontSize: 12, fontWeight: '700', letterSpacing: 0.7 }}>
          NUT TRACKER
        </Text>
        <Text selectable allowFontScaling={false} style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
          {safe}% Stashed
        </Text>
      </View>
      <View
        style={{
          backgroundColor: '#E9E6DF',
          borderRadius: 999,
          height: 30,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#DAD4C9'
        }}
      >
        <Text
          selectable
          allowFontScaling={false}
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: 6,
            color: '#D4CDC0',
            fontSize: 9,
            letterSpacing: 3
          }}
          numberOfLines={1}
        >
          ·························································································
        </Text>
        <View
          style={{
            backgroundColor: '#66BB6A',
            width: `${safe}%`,
            height: '100%',
            borderRadius: 999,
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingRight: 8
          }}
        >
          <Text selectable allowFontScaling={false} style={{ fontSize: 13, opacity: 0.85 }}>
            {nuts}
          </Text>
        </View>
      </View>
    </View>
  );
}
