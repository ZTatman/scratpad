import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/use-app-store';
import { colors } from '@/theme/colors';
import { ReminderSettings } from '@/types/models';

type TimeTarget = 'briefing' | 'quietStart' | 'quietEnd' | null;
const SNOOZE_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '3h', minutes: 180 }
] as const;

function hhmmToDate(value: string): Date {
  const [h, m] = value.split(':').map((part) => Number(part));
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
}

function toHHmm(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function toDisplayTime(value: string): string {
  const date = hhmmToDate(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = useAppStore((state) => state.settings);
  const saveReminderSettings = useAppStore((state) => state.saveReminderSettings);

  const [settings, setSettings] = React.useState<ReminderSettings>(current);
  const [timeTarget, setTimeTarget] = React.useState<TimeTarget>(null);

  React.useEffect(() => {
    // Keep local form in sync if settings are changed elsewhere (e.g. future remote sync).
    setSettings(current);
  }, [current]);

  const pickerDate = React.useMemo(() => {
    if (timeTarget === 'briefing') return hhmmToDate(settings.dailyBriefingTime);
    if (timeTarget === 'quietStart') return hhmmToDate(settings.quietHoursStart);
    return hhmmToDate(settings.quietHoursEnd);
  }, [settings.dailyBriefingTime, settings.quietHoursEnd, settings.quietHoursStart, timeTarget]);

  const saveAndBack = async () => {
    // Persist first, then navigate, so Today screen immediately reflects guardrail changes.
    await saveReminderSettings(settings);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7F3', paddingTop: insets.top }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 36, gap: 14 }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            minHeight: 64,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E1D5',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#FBFAF6'
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text selectable allowFontScaling={false} style={{ fontSize: 22, color: '#704214' }}>
              ←
            </Text>
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text selectable allowFontScaling={false} style={{ fontSize: 16, color: '#704214' }}>
              🐰
            </Text>
            <Text
              selectable
              allowFontScaling={false}
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 17, color: '#1E2B1B', fontWeight: '800' }}
            >
              Scratpad Settings
            </Text>
          </View>
          <Pressable
            onPress={saveAndBack}
            style={{
              backgroundColor: colors.forest,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)'
            }}
          >
            <Text selectable allowFontScaling={false} style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>
              Save
            </Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16, paddingTop: 8 }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <Text selectable allowFontScaling={false} style={styles.cardTitle}>
                  Enable Reminders
                </Text>
                <Text selectable allowFontScaling={false} style={styles.subtle}>
                  Allow notifications &amp; SMS
                </Text>
              </View>
              <Switch
                value={settings.remindersEnabled}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, remindersEnabled: value }))}
                trackColor={{ false: '#C8CDD3', true: colors.forest }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>

          <SectionTitle icon="☀︎" title="DAILY BRIEFING" />
          <Card>
            <RowBetween>
              <Text selectable allowFontScaling={false} style={[styles.rowText, { flex: 1, marginRight: 8 }]}>
                Receive Morning Summary
              </Text>
              <Switch
                value={settings.dailyBriefingEnabled}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, dailyBriefingEnabled: value }))}
                trackColor={{ false: '#C8CDD3', true: colors.forest }}
                thumbColor="#FFFFFF"
              />
            </RowBetween>

            <RowBetween>
              <Text selectable allowFontScaling={false} style={[styles.rowText, { flex: 1, marginRight: 8 }]}>
                Set Delivery Time
              </Text>
              <Pressable onPress={() => setTimeTarget('briefing')} style={styles.timePill}>
                <Text
                  selectable
                  allowFontScaling={false}
                  style={{ color: colors.forest, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] }}
                >
                  {toDisplayTime(settings.dailyBriefingTime)}
                </Text>
                <Text selectable allowFontScaling={false} style={{ color: '#1E2B1B', fontSize: 14 }}>
                  ◷
                </Text>
              </Pressable>
            </RowBetween>

            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#D7E2D9',
                backgroundColor: '#EAF1EC',
                paddingVertical: 10,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
                <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 16 }}>
                  🌲
                </Text>
                <Text selectable allowFontScaling={false} style={{ color: '#607066', fontSize: 14, flex: 1 }}>
                Start your day with a gathered list of your acorns (tasks).
              </Text>
            </View>
          </Card>

          <SectionTitle icon="👥" title="CONTACT METHOD" />
          <Card>
            <Text selectable allowFontScaling={false} style={styles.rowText}>
              Phone Number
            </Text>
            <View style={{ flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: '#CCC6B9', overflow: 'hidden' }}>
              <View
                style={{
                  width: 74,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRightWidth: 1,
                  borderRightColor: '#CCC6B9',
                  backgroundColor: '#F7F5F0'
                }}
              >
                <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 16, fontWeight: '500' }}>
                  US +1
                </Text>
              </View>
              <TextInput
                value={settings.phoneNumber}
                onChangeText={(value) => setSettings((prev) => ({ ...prev, phoneNumber: value }))}
                placeholder="(555) 123-4567"
                placeholderTextColor="#7F8896"
                keyboardType="phone-pad"
                allowFontScaling={false}
                style={{
                  flex: 1,
                  height: 44,
                  paddingHorizontal: 12,
                  color: '#1E2B1B',
                  fontSize: 16,
                  lineHeight: 20
                }}
              />
            </View>
          </Card>

          <SectionTitle icon="🕘" title="SCHEDULE & FREQUENCY" />
          <Card style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
            <View style={{ padding: 14, gap: 12 }}>
              <RowBetween>
                <Text selectable allowFontScaling={false} style={styles.rowText}>
                  Reminder Interval
                </Text>
                <Badge text={`${settings.minSpacingMinutes}m`} />
              </RowBetween>
              <Slider
                minimumValue={5}
                maximumValue={60}
                step={5}
                value={settings.minSpacingMinutes}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, minSpacingMinutes: value }))}
                minimumTrackTintColor={colors.forest}
                maximumTrackTintColor="#CDD3D8"
                thumbTintColor={colors.forest}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text selectable allowFontScaling={false} style={styles.scaleLabel}>
                  5m
                </Text>
                <Text selectable allowFontScaling={false} style={styles.scaleLabel}>
                  30m
                </Text>
                <Text selectable allowFontScaling={false} style={styles.scaleLabel}>
                  60m
                </Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E1D5', padding: 14, gap: 12 }}>
              <RowBetween>
                <Text selectable allowFontScaling={false} style={styles.rowText}>
                  Quiet Hours
                </Text>
                <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 18 }}>
                  🌙
                </Text>
              </RowBetween>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable allowFontScaling={false} style={styles.label}>
                    Start
                  </Text>
                  <Pressable onPress={() => setTimeTarget('quietStart')} style={styles.timeField}>
                    <Text selectable allowFontScaling={false} style={styles.timeFieldText}>
                      {toDisplayTime(settings.quietHoursStart)}
                    </Text>
                    <Text selectable allowFontScaling={false} style={{ color: '#1E2B1B', fontSize: 14 }}>
                      ◷
                    </Text>
                  </Pressable>
                </View>
                <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 18, marginTop: 18 }}>
                  →
                </Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable allowFontScaling={false} style={styles.label}>
                    End
                  </Text>
                  <Pressable onPress={() => setTimeTarget('quietEnd')} style={styles.timeField}>
                    <Text selectable allowFontScaling={false} style={styles.timeFieldText}>
                      {toDisplayTime(settings.quietHoursEnd)}
                    </Text>
                    <Text selectable allowFontScaling={false} style={{ color: '#1E2B1B', fontSize: 14 }}>
                      ◷
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SectionTitle icon="🛡️" title="GUARDRAILS" noMargin />
            <View
              style={{
                backgroundColor: colors.forest,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 5
              }}
            >
              <Text selectable allowFontScaling={false} style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>
                Anti-Burnout
              </Text>
            </View>
          </View>

          <Card>
            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#D7E2D9',
                backgroundColor: '#EAF1EC',
                paddingVertical: 10,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
              <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 16 }}>
                ⚙️
              </Text>
              <Text selectable allowFontScaling={false} style={{ color: '#607066', fontSize: 14, flex: 1 }}>
                Prevents notification fatigue by limiting total alerts. Stay sane!
              </Text>
            </View>

            <CounterRow
              label="Max Daily Reminders"
              value={settings.maxDailyReminders}
              onChange={(value) => setSettings((prev) => ({ ...prev, maxDailyReminders: value }))}
              min={1}
              max={50}
            />

            <CounterRow
              label="Max Per Task"
              value={settings.maxRemindersPerTask}
              onChange={(value) => setSettings((prev) => ({ ...prev, maxRemindersPerTask: value }))}
              min={1}
              max={30}
            />

            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E1D5', paddingTop: 12, gap: 12 }}>
              <RowBetween>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text selectable allowFontScaling={false} style={styles.rowText}>
                    Minimum Spacing
                  </Text>
                  <Text selectable allowFontScaling={false} style={{ color: '#9B8064', fontSize: 15 }}>
                    ❔
                  </Text>
                </View>
                <Badge text={`${settings.minSpacingMinutes}m`} />
              </RowBetween>
              <Slider
                minimumValue={5}
                maximumValue={60}
                step={5}
                value={settings.minSpacingMinutes}
                onValueChange={(value) => setSettings((prev) => ({ ...prev, minSpacingMinutes: value }))}
                minimumTrackTintColor={colors.forest}
                maximumTrackTintColor="#CDD3D8"
                thumbTintColor={colors.forest}
              />
            </View>
          </Card>

          <SectionTitle icon="⏰" title="SNOOZE PRESETS" />
          <Card>
            <Text selectable allowFontScaling={false} style={{ color: '#5C6655', fontSize: 14 }}>
              Default options shown when snoozing.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {SNOOZE_PRESETS.map((preset) => {
                const active = settings.defaultSnoozeMinutes === preset.minutes;
                return (
                  <Pressable
                    key={preset.label}
                    onPress={() => setSettings((prev) => ({ ...prev, defaultSnoozeMinutes: preset.minutes }))}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: active ? 0 : 1,
                      borderColor: active ? 'transparent' : '#D0CBC0',
                      backgroundColor: active ? colors.forest : '#FFFFFF'
                    }}
                  >
                    <Text
                      selectable
                      allowFontScaling={false}
                      style={{
                        color: active ? 'white' : preset.label === '1h' ? colors.forest : '#704214',
                        fontSize: 16,
                        fontWeight: active ? '800' : '700'
                      }}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>
      </ScrollView>

      {timeTarget ? (
        <DateTimePicker
          mode="time"
          display="spinner"
          value={pickerDate}
          onChange={(_, date) => {
            setTimeTarget(null);
            if (!date) return;
            const value = toHHmm(date);
            if (timeTarget === 'briefing') {
              setSettings((prev) => ({ ...prev, dailyBriefingTime: value }));
              return;
            }
            if (timeTarget === 'quietStart') {
              setSettings((prev) => ({ ...prev, quietHoursStart: value }));
              return;
            }
            setSettings((prev) => ({ ...prev, quietHoursEnd: value }));
          }}
        />
      ) : null}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#E6E2D3',
          padding: 14,
          gap: 12,
          borderCurve: 'continuous' as const,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

function SectionTitle({ icon, title, noMargin = false }: { icon: string; title: string; noMargin?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: noMargin ? 0 : 2, flexShrink: 1 }}>
      <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 16 }}>
        {icon}
      </Text>
      <Text
        selectable
        allowFontScaling={false}
        numberOfLines={1}
        style={{ color: '#704214', fontSize: 13, fontWeight: '800', letterSpacing: 1 }}
      >
        {title}
      </Text>
    </View>
  );
}

function RowBetween({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      {children}
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={{ backgroundColor: '#7D3F14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text selectable allowFontScaling={false} style={{ color: 'white', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
        {text}
      </Text>
    </View>
  );
}

function CounterRow({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <RowBetween>
      <Text selectable allowFontScaling={false} style={styles.rowText}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ECE9E2',
            borderWidth: 1,
            borderColor: '#E1DCD0'
          }}
        >
          <Text selectable allowFontScaling={false} style={{ color: colors.forest, fontSize: 18, fontWeight: '700' }}>
            –
          </Text>
        </Pressable>
        <Text selectable allowFontScaling={false} style={{ color: '#704214', fontSize: 24, fontWeight: '800', minWidth: 26, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.forest
          }}
        >
          <Text selectable allowFontScaling={false} style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>
            +
          </Text>
        </Pressable>
      </View>
    </RowBetween>
  );
}

const styles = {
  cardTitle: {
    color: '#1E2B1B',
    fontSize: 16,
    fontWeight: '700'
  } as const,
  subtle: {
    color: '#704214',
    fontSize: 12
  } as const,
  rowText: {
    color: '#1E2B1B',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    flexShrink: 1,
    minWidth: 0
  } as const,
  label: {
    color: '#704214',
    fontSize: 13,
    fontWeight: '700'
  } as const,
  timePill: {
    borderWidth: 1,
    borderColor: '#CFC8BC',
    borderRadius: 10,
    minWidth: 120,
    height: 42,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    flexShrink: 0
  } as const,
  timeField: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CEC8BC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10
  } as const,
  timeFieldText: {
    color: '#1E2B1B',
    fontSize: 14,
    fontWeight: '500'
  } as const,
  scaleLabel: {
    color: '#8C6B49',
    fontSize: 12
  } as const
};
