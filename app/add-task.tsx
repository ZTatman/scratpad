import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "@/store/use-app-store";
import { colors } from "@/theme/colors";
import { RepeatType } from "@/types/models";

const HOURS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"] as const;
const WHEEL_ROW_HEIGHT = 44;
const WHEEL_VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = WHEEL_ROW_HEIGHT * WHEEL_VISIBLE_ROWS;

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function applyDay(base: Date, day: Date): Date {
  const next = new Date(base);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next;
}

function toHour12(hour24: number): number {
  const h = hour24 % 12;
  return h === 0 ? 12 : h;
}

function minuteToClosestStep(minute: number): number {
  const rounded = Math.round(minute / 15) * 15;
  return Math.min(45, Math.max(0, rounded));
}

function setTimeParts(
  base: Date,
  nextHour12: number,
  nextMinute: number,
  nextPeriod: "AM" | "PM",
): Date {
  const updated = new Date(base);
  const normalizedHour12 = Math.min(12, Math.max(1, nextHour12));
  const hour24 = (normalizedHour12 % 12) + (nextPeriod === "PM" ? 12 : 0);
  updated.setHours(hour24, nextMinute, 0, 0);
  return updated;
}

function animateLayout() {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function AddTaskScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addTask = useAppStore((state) => state.addTask);

  const [title, setTitle] = React.useState("");
  const [selectedDateTime, setSelectedDateTime] = React.useState(() => {
    const now = new Date();
    now.setMinutes(minuteToClosestStep(now.getMinutes()), 0, 0);
    return now;
  });
  const [repeat, setRepeat] = React.useState<RepeatType>("NONE");
  const [selectedWeekdays, setSelectedWeekdays] = React.useState<number[]>([
    1, 3, 5,
  ]); // M/W/F
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  // While faux wheel is being dragged, disable parent scroll to prevent gesture conflicts.
  const [wheelInteracting, setWheelInteracting] = React.useState(false);

  const titleValid = title.trim().length > 0;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const hour12 = toHour12(selectedDateTime.getHours());
  const minute = minuteToClosestStep(selectedDateTime.getMinutes());
  const period: "AM" | "PM" = selectedDateTime.getHours() >= 12 ? "PM" : "AM";

  const selectedHourIndex = hour12 - 1;
  const selectedMinuteIndex = MINUTES.indexOf(String(minute).padStart(2, "0"));
  const selectedPeriodIndex = period === "PM" ? 1 : 0;

  const repeatOptions: { value: RepeatType; label: string }[] = [
    { value: "NONE", label: "None" },
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
  ];

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const selectDate = (day: Date) => {
    animateLayout();
    setSelectedDateTime((prev) => applyDay(prev, day));
  };

  const onHourChange = (index: number) => {
    const nextHour = index + 1;
    setSelectedDateTime((prev) => setTimeParts(prev, nextHour, minute, period));
  };

  const onMinuteChange = (index: number) => {
    const nextMinute = Number(MINUTES[index] || "00");
    setSelectedDateTime((prev) =>
      setTimeParts(prev, hour12, nextMinute, period),
    );
  };

  const onPeriodChange = (index: number) => {
    const nextPeriod = PERIODS[index] || "AM";
    setSelectedDateTime((prev) =>
      setTimeParts(prev, hour12, minute, nextPeriod),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAF6" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: 8,
          backgroundColor: "#FFFFFF",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="arrow-back" size={32} color={colors.forest} />
        </Pressable>
        <Text
          selectable
          allowFontScaling={false}
          style={{ color: colors.forest, fontSize: 18, fontWeight: "800" }}
        >
          New Task
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        scrollEnabled={!wheelInteracting}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 188,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 22 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor="#CBD5E1"
            multiline
            autoFocus
            style={{
              minHeight: 118,
              fontSize: 46,
              lineHeight: 58,
              fontWeight: "800",
              color: "#0F172A",
              padding: 0,
              paddingTop: 8,
              textAlignVertical: "top",
            }}
          />

          <View style={{ gap: 10 }}>
            <SectionLabel
              icon="calendar-today"
              text="Due Date"
              tone="primary"
            />
            <View
              style={{
                backgroundColor: "#F8FAF6",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#D9EEE0",
                padding: 4,
                flexDirection: "row",
                gap: 4,
              }}
            >
              <DateCard
                label="Today"
                date={today}
                selected={sameDate(selectedDateTime, today)}
                onPress={() => selectDate(today)}
              />
              <DateCard
                label="Tomorrow"
                date={tomorrow}
                selected={sameDate(selectedDateTime, tomorrow)}
                onPress={() => selectDate(tomorrow)}
              />
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  width: 64,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="edit-calendar" size={30} color="#94A3B8" />
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <SectionLabel icon="schedule" text="Time" tone="primary" />
            <View
              style={{
                backgroundColor: "#F8FAF6",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#D9EEE0",
                height: 144,
                padding: 16,
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  top: "50%",
                  marginTop: -28,
                  height: 56,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#D9EEE0",
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: "100%",
                  zIndex: 2,
                }}
              >
                <WheelPicker
                  options={HOURS}
                  selectedIndex={selectedHourIndex}
                  onChange={onHourChange}
                  onInteractionChange={setWheelInteracting}
                />
                <Text
                  selectable
                  allowFontScaling={false}
                  style={{
                    color: "#CBD5E1",
                    fontSize: 34,
                    fontWeight: "700",
                    marginBottom: 2,
                  }}
                >
                  :
                </Text>
                <WheelPicker
                  options={MINUTES}
                  selectedIndex={selectedMinuteIndex}
                  onChange={onMinuteChange}
                  onInteractionChange={setWheelInteracting}
                />
                <View style={{ flex: 1, height: WHEEL_HEIGHT }}>
                  <View
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: (WHEEL_HEIGHT - 56) / 2,
                      height: 56,
                      backgroundColor: "rgba(139,69,19,0.12)",
                      borderRadius: 10,
                    }}
                  />
                  <WheelPicker
                    options={PERIODS as unknown as string[]}
                    selectedIndex={selectedPeriodIndex}
                    onChange={onPeriodChange}
                    onInteractionChange={setWheelInteracting}
                    activeColor={colors.acorn}
                    inactiveColor="#CBD5E1"
                    activeSize={30}
                    inactiveSize={24}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={{ gap: 10, paddingBottom: 16 }}>
            <SectionLabel icon="event-repeat" text="Repeat" tone="primary" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {repeatOptions.map((option) => {
                const active = repeat === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      animateLayout();
                      setRepeat(option.value);
                    }}
                    style={{
                      minWidth: 126,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.acorn : "#CBD5E1",
                      backgroundColor: active ? colors.acorn : "#FFFFFF",
                      paddingVertical: 10,
                      paddingHorizontal: 22,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      selectable
                      allowFontScaling={false}
                      style={{
                        color: active ? "white" : "#64748B",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={{
                backgroundColor: "#F8FAF6",
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#D9EEE0",
                paddingHorizontal: 10,
                paddingVertical: 8,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {weekdays.map((label, index) => {
                const dayIndex = index + 1;
                const active = selectedWeekdays.includes(dayIndex);
                const disabled = repeat !== "WEEKLY";
                return (
                  <Pressable
                    key={`${label}-${index}`}
                    disabled={disabled}
                    onPress={() =>
                      setSelectedWeekdays((prev) =>
                        prev.includes(dayIndex)
                          ? prev.filter((d) => d !== dayIndex)
                          : [...prev, dayIndex],
                      )
                    }
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? colors.acorn : "#FFFFFF",
                      borderWidth: active ? 0 : 1,
                      borderColor: "#E2E8F0",
                      opacity: disabled ? 0.45 : 1,
                    }}
                  >
                    <Text
                      selectable
                      allowFontScaling={false}
                      style={{
                        color: active ? "#FFFFFF" : "#64748B",
                        fontSize: 16,
                        fontWeight: "700",
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 132,
          justifyContent: "flex-end",
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom + 10, 18),
          backgroundColor: "rgba(253,251,247,0.96)",
        }}
        pointerEvents="box-none"
      >
        <Pressable
          disabled={!titleValid}
          onPress={async () => {
            if (!titleValid) return;
            // Task creation stays in store so both UI and scheduler use the same source of truth.
            await addTask({
              title,
              dueAt: selectedDateTime,
              repeat,
            });
            router.back();
          }}
          style={{
            width: "100%",
            borderRadius: 18,
            backgroundColor: titleValid ? colors.forest : "#8FA58A",
            paddingVertical: 18,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            boxShadow: "0 10px 14px rgba(45,90,39,0.28)",
          }}
        >
          <MaterialIcons name="notifications-active" size={22} color="white" />
          <Text
            selectable
            allowFontScaling={false}
            style={{ color: "white", fontSize: 20, fontWeight: "800" }}
          >
            Set Reminder
          </Text>
        </Pressable>
      </View>

      {showDatePicker ? (
        <DateTimePicker
          mode="date"
          display="spinner"
          value={selectedDateTime}
          onChange={(_, next) => {
            setShowDatePicker(false);
            if (!next) return;
            animateLayout();
            setSelectedDateTime((prev) => applyDay(prev, next));
          }}
        />
      ) : null}
    </View>
  );
}

function SectionLabel({
  icon,
  text,
  tone,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  tone: "primary" | "muted";
}) {
  const color = tone === "primary" ? colors.forest : "#94A3B8";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialIcons name={icon} size={20} color={color} />
      <Text
        selectable
        allowFontScaling={false}
        style={{
          color,
          fontSize: 14,
          fontWeight: "800",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function DateCard({
  label,
  date,
  selected,
  onPress,
}: {
  label: string;
  date: Date;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 92,
        borderRadius: 16,
        backgroundColor: selected ? "#FFFFFF" : "transparent",
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? "#DBE7DF" : "transparent",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
      }}
    >
      <Text
        selectable
        allowFontScaling={false}
        style={{
          color: selected ? colors.acorn : "#94A3B8",
          fontWeight: "800",
          fontSize: 12,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        selectable
        allowFontScaling={false}
        style={{
          color: selected ? "#0F172A" : "#94A3B8",
          fontWeight: "900",
          fontSize: 24,
          marginTop: 2,
        }}
      >
        {date.toLocaleDateString([], { month: "short", day: "numeric" })}
      </Text>
    </Pressable>
  );
}

function WheelPicker({
  options,
  selectedIndex,
  onChange,
  onInteractionChange,
  activeColor = colors.acorn,
  inactiveColor = "#CBD5E1",
  activeSize = 34,
  inactiveSize = 28,
}: {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  onInteractionChange?: (active: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  activeSize?: number;
  inactiveSize?: number;
}) {
  const ref = React.useRef<ScrollView | null>(null);
  const inset = (WHEEL_HEIGHT - WHEEL_ROW_HEIGHT) / 2;

  React.useEffect(() => {
    ref.current?.scrollTo({
      y: selectedIndex * WHEEL_ROW_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const handleEnd = (offsetY: number) => {
    const raw = Math.round(offsetY / WHEEL_ROW_HEIGHT);
    const bounded = Math.max(0, Math.min(options.length - 1, raw));
    if (bounded !== selectedIndex) onChange(bounded);
  };

  return (
    <View style={{ flex: 1, height: WHEEL_HEIGHT }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: inset }}
        onTouchStart={() => onInteractionChange?.(true)}
        onTouchEnd={() => onInteractionChange?.(false)}
        onScrollBeginDrag={() => onInteractionChange?.(true)}
        onMomentumScrollBegin={() => onInteractionChange?.(true)}
        onMomentumScrollEnd={(event) => {
          handleEnd(event.nativeEvent.contentOffset.y);
          onInteractionChange?.(false);
        }}
        onScrollEndDrag={(event) => {
          handleEnd(event.nativeEvent.contentOffset.y);
          onInteractionChange?.(false);
        }}
      >
        {options.map((value, index) => {
          const active = index === selectedIndex;
          return (
            <View
              key={`${value}-${index}`}
              style={{
                height: WHEEL_ROW_HEIGHT,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                selectable
                allowFontScaling={false}
                style={{
                  fontSize: active ? activeSize : inactiveSize,
                  fontWeight: active ? "900" : "500",
                  color: active ? activeColor : inactiveColor,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {value}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
