import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectors, useAppStore } from '@/store/use-app-store';
import { Task } from '@/types/models';
import { colors } from '@/theme/colors';

type Section = {
  key: string;
  title: string;
  data: Task[];
  palette: {
    badgeBg: string;
    badgeFg: string;
    titleColor: string;
    subtitleColor: string;
    rowOpacity: number;
  };
};

function formatSectionLabel(key: string, todayKey: string, yesterdayKey: string): string {
  if (key === todayKey) return "TODAY'S HARVEST";
  if (key === yesterdayKey) return 'YESTERDAY';
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }).toUpperCase();
}

function sectionPalette(index: number): Section['palette'] {
  if (index === 0) {
    return { badgeBg: '#6B4438', badgeFg: '#F5F4F0', titleColor: '#4B342B', subtitleColor: '#8A6D62', rowOpacity: 1 };
  }
  if (index === 1) {
    return { badgeBg: '#3F9148', badgeFg: '#F5F4F0', titleColor: '#4B342B', subtitleColor: '#8A6D62', rowOpacity: 0.95 };
  }
  return { badgeBg: '#AB9790', badgeFg: '#F5F4F0', titleColor: '#64514B', subtitleColor: '#8A7A73', rowOpacity: 0.86 };
}

export default function ArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tasks = useAppStore((state) => state.tasks);
  const grouped = selectors.groupedDoneByDate(tasks);
  const sortedKeys = React.useMemo(() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)), [grouped]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  // Build presentation-first sections so SectionList stays simple and fast.
  const sections = React.useMemo<Section[]>(
    () =>
      sortedKeys.map((key, index) => ({
        key,
        title: formatSectionLabel(key, todayKey, yesterdayKey),
        data: grouped[key],
        palette: sectionPalette(index)
      })),
    [grouped, sortedKeys, todayKey, yesterdayKey]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F0' }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#E6E1D7',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text selectable allowFontScaling={false} style={{ color: colors.acorn, fontSize: 34 }}>
            ←
          </Text>
        </Pressable>
        <Text selectable allowFontScaling={false} style={{ color: '#5B3327', fontSize: 22 }}>
          🌰
        </Text>
        <Text
          selectable
          allowFontScaling={false}
          numberOfLines={1}
          style={{ color: '#5B3327', fontSize: 44, fontWeight: '900', flexShrink: 1 }}
        >
          The Nut Stash
        </Text>
      </View>

      {sections.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E6E2D8' }}>
            <Text selectable allowFontScaling={false} style={{ color: '#7A8075', fontSize: 15 }}>
              No past wins yet.
            </Text>
          </View>
        </View>
      ) : (
        <SectionList
          // SectionList virtualizes rows and scales better than ScrollView for longer history.
          sections={sections}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 96 }}
          renderSectionHeader={({ section }) => (
            <View style={{ marginTop: section.key === sections[0]?.key ? 2 : 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Text
                  selectable
                  allowFontScaling={false}
                  style={{ color: colors.forest, fontSize: 13, fontWeight: '800', letterSpacing: 1.1 }}
                >
                  {section.title}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#D9E2D2' }} />
              </View>
            </View>
          )}
          renderItem={({ item, section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: section.palette.rowOpacity
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: section.palette.badgeBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 2
                }}
              >
                <Text selectable allowFontScaling={false} style={{ fontSize: 16, color: section.palette.badgeFg }}>
                  🥜
                </Text>
              </View>

              <View style={{ flex: 1, paddingTop: 1 }}>
                <Text selectable allowFontScaling={false} style={{ color: section.palette.titleColor, fontSize: 17, fontWeight: '500' }}>
                  {item.title}
                </Text>
                {section.key === todayKey ? (
                  <Text selectable allowFontScaling={false} style={{ color: section.palette.subtitleColor, fontSize: 13, marginTop: 2 }}>
                    Added to the stash
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={{ alignItems: 'center', opacity: 0.26, marginTop: 18 }}>
              <Text selectable allowFontScaling={false} style={{ fontSize: 20, color: '#7D746E' }}>
                🌲
              </Text>
              <Text selectable allowFontScaling={false} style={{ fontSize: 14, color: '#7D746E', marginTop: 2 }}>
                •
              </Text>
              <Text selectable allowFontScaling={false} style={{ fontSize: 14, color: '#7D746E' }}>
                •
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
