import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { EmptyState } from "@/components/empty-state";
import { NutTracker } from "@/components/nut-tracker";
import { TaskCard } from "@/components/task-card";
import { selectors, useAppStore } from "@/store/use-app-store";
import { colors } from "@/theme/colors";

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    tasks,
    deletedTask,
    activeBreakdownTaskId,
    hydrate,
    setTaskDone,
    rolloverTask,
    undoRolloverTask,
    deleteTask,
    undoDelete,
    updateTaskDueTime,
    applyBreakdownReply,
  } = useAppStore(
    useShallow((state) => ({
      tasks: state.tasks,
      deletedTask: state.deletedTask,
      activeBreakdownTaskId: state.activeBreakdownTaskId,
      hydrate: state.hydrate,
      setTaskDone: state.setTaskDone,
      rolloverTask: state.rolloverTask,
      undoRolloverTask: state.undoRolloverTask,
      deleteTask: state.deleteTask,
      undoDelete: state.undoDelete,
      updateTaskDueTime: state.updateTaskDueTime,
      applyBreakdownReply: state.applyBreakdownReply,
    })),
  );

  const [undoToast, setUndoToast] = React.useState<
    | { type: "delete" }
    | {
        type: "rollover";
        taskId: string;
        previousDueAt: string;
        previousRolloverCount: number;
      }
    | null
  >(null);
  const [breakdownInput, setBreakdownInput] = React.useState("");

  // Derived lists keep rendering logic simple and make UI state explicit.
  const todayTasks = React.useMemo(() => selectors.todayTasks(tasks), [tasks]);
  const pending = todayTasks.filter((task) => task.status === "PENDING");
  const done = todayTasks.filter((task) => task.status === "DONE");
  const percent = selectors.donePercent(todayTasks);

  React.useEffect(() => {
    // Safe to call multiple times; hydration loads persisted store slices once ready.
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (deletedTask) {
      setUndoToast({ type: "delete" });
      const timeout = setTimeout(
        () =>
          setUndoToast((current) =>
            current?.type === "delete" ? null : current,
          ),
        3500,
      );
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [deletedTask]);

  const handleRollover = React.useCallback(
    async (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === "DONE") return;

      const previousDueAt = task.dueAt;
      const previousRolloverCount = task.rolloverCount;

      await rolloverTask(taskId);
      setUndoToast({
        type: "rollover",
        taskId,
        previousDueAt,
        previousRolloverCount,
      });
      // Undo window mirrors delete undo behavior for consistency.
      setTimeout(
        () =>
          setUndoToast((current) =>
            current?.type === "rollover" && current.taskId === taskId
              ? null
              : current,
          ),
        3500,
      );
    },
    [rolloverTask, tasks],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#E6E4E0" }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 128,
        }}
      >
        <View
          style={{
            backgroundColor: colors.cream,
            borderRadius: 32,
            padding: 16,
            gap: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <MaterialCommunityIcons
                name="pine-tree"
                size={22}
                color={colors.forest}
              />
              <Text
                selectable
                allowFontScaling={false}
                style={{
                  color: colors.forest,
                  fontWeight: "900",
                  fontSize: 20,
                  letterSpacing: 0.6,
                }}
              >
                SCRATPAD
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => router.push("/archive")}
                style={{
                  backgroundColor: "#ECEBE8",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="emoji-events" size={19} color="#5D5E59" />
              </Pressable>
              <Pressable
                onPress={() => router.push("/settings")}
                style={{
                  backgroundColor: "#ECEBE8",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="settings" size={19} color="#5D5E59" />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 10,
            }}
          >
            <Text
              selectable
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                color: colors.forest,
                fontSize: 56,
                fontWeight: "900",
                lineHeight: 60,
                flexShrink: 1,
              }}
            >
              {new Date().toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                flexShrink: 1,
                maxWidth: "46%",
              }}
            >
              <MaterialCommunityIcons
                name="pine-tree"
                size={16}
                color={colors.acorn}
              />
              <Text
                selectable
                allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: colors.acorn,
                  fontSize: 12,
                  fontWeight: "800",
                  flexShrink: 1,
                }}
              >
                {pending.length} nuts to crack
              </Text>
            </View>
          </View>

          <NutTracker percent={percent} />

          {todayTasks.length === 0 ? <EmptyState /> : null}

          {pending.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDone={setTaskDone}
              onRollover={handleRollover}
              onDelete={deleteTask}
              onUpdateTime={updateTaskDueTime}
            />
          ))}

          {done.length > 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text
                selectable
                allowFontScaling={false}
                style={{
                  color: "#909687",
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: 0.6,
                }}
              >
                BURIED ACORNS
              </Text>
              {done.map((task) => (
                <View
                  key={task.id}
                  style={{
                    backgroundColor: "#F4F2ED",
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Text
                    selectable
                    allowFontScaling={false}
                    numberOfLines={1}
                    style={{
                      color: "#7E8378",
                      fontSize: 18,
                      textDecorationLine: "line-through",
                    }}
                  >
                    🌰 {task.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeBreakdownTaskId ? (
            <View
              style={{
                backgroundColor: "#FFF5E9",
                borderRadius: 14,
                padding: 14,
                gap: 8,
              }}
            >
              <Text
                selectable
                allowFontScaling={false}
                style={{ color: colors.acorn, fontWeight: "800", fontSize: 16 }}
              >
                Break it down prompt active
              </Text>
              <Text
                selectable
                allowFontScaling={false}
                style={{ color: "#7F5B39" }}
              >
                Reply with comma-separated steps (example: wash, dry, fold)
              </Text>
              <TextInput
                value={breakdownInput}
                onChangeText={setBreakdownInput}
                placeholder="wash, dry, fold"
                placeholderTextColor="#AA9278"
                style={{
                  borderWidth: 1,
                  borderColor: "#E9D8C5",
                  borderRadius: 10,
                  backgroundColor: "#FFFDF9",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: "#5F442C",
                }}
              />
              <Pressable
                onPress={async () => {
                  await applyBreakdownReply(breakdownInput);
                  setBreakdownInput("");
                }}
                style={{
                  backgroundColor: colors.acorn,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text
                  selectable
                  allowFontScaling={false}
                  style={{ color: "white", fontWeight: "800" }}
                >
                  Apply Breakdown
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push("/add-task")}
        style={{
          position: "absolute",
          right: 24,
          bottom: 28,
          backgroundColor: colors.acorn,
          width: 76,
          height: 76,
          borderRadius: 38,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 6,
          borderColor: "#F7F4EE",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        <MaterialIcons name="add" size={40} color="white" />
      </Pressable>

      {undoToast ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 18,
            backgroundColor: "#2C2C2A",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text selectable allowFontScaling={false} style={{ color: "white" }}>
            {undoToast.type === "delete" ? "Task deleted" : "Task rolled over"}
          </Text>
          <Pressable
            onPress={async () => {
              const toast = undoToast;
              setUndoToast(null);

              if (toast.type === "delete") {
                await undoDelete();
                return;
              }

              await undoRolloverTask(
                toast.taskId,
                toast.previousDueAt,
                toast.previousRolloverCount,
              );
            }}
          >
            <Text
              selectable
              allowFontScaling={false}
              style={{ color: "#A6D891", fontWeight: "800" }}
            >
              UNDO
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
