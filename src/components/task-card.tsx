import DateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import { Text, View, Pressable } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { Task } from "@/types/models";

type TaskCardProps = {
  task: Task;
  onDone: (taskId: string) => void;
  onRollover: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onUpdateTime: (taskId: string, hours: number, minutes: number) => void;
};

export function TaskCard({
  task,
  onDone,
  onRollover,
  onDelete,
  onUpdateTime,
}: TaskCardProps) {
  const [editingTime, setEditingTime] = React.useState(false);

  const dueDate = new Date(task.dueAt);
  const label = dueDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Swipeable
      renderRightActions={() => (
        <View
          style={{
            backgroundColor: colors.danger,
            justifyContent: "center",
            alignItems: "center",
            width: 84,
            borderRadius: 24,
            marginBottom: 12,
          }}
        >
          <MaterialIcons name="delete" size={26} color="white" />
          <Text
            selectable
            allowFontScaling={false}
            style={{
              color: "white",
              fontWeight: "800",
              marginTop: 2,
              fontSize: 11,
            }}
          >
            DELETE
          </Text>
        </View>
      )}
      onSwipeableOpen={() => onDelete(task.id)}
      friction={1.8}
    >
      <View
        style={{
          backgroundColor: "#FAF9F7",
          borderRadius: 24,
          padding: 14,
          gap: 18,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: "#E5E1D8",
          overflow: "hidden",
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 5 },
          shadowRadius: 9,
          elevation: 2,
        }}
      >
        <Text
          selectable
          allowFontScaling={false}
          style={{
            position: "absolute",
            right: 14,
            top: 10,
            fontSize: 58,
            color: "#CEC6BB",
            opacity: 0.2,
          }}
        >
          🌲
        </Text>
        <Pressable
          onPress={() => setEditingTime((value) => !value)}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#F2F1EE",
            borderWidth: 1,
            borderColor: "#E1DDD5",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            selectable
            allowFontScaling={false}
            style={{ color: colors.acorn, fontWeight: "800", fontSize: 13 }}
          >
            ◔ {label.toUpperCase()}
          </Text>
        </Pressable>

        {editingTime ? (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="spinner"
            onChange={(_, selected) => {
              if (!selected) return;
              onUpdateTime(task.id, selected.getHours(), selected.getMinutes());
            }}
          />
        ) : null}

        <Text
          selectable
          allowFontScaling={false}
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.text,
            lineHeight: 34,
          }}
        >
          {task.title}
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => onRollover(task.id)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#DBD7CE",
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <MaterialIcons name="refresh" size={16} color="#686866" />
            <Text
              selectable
              allowFontScaling={false}
              style={{
                color: "#686866",
                fontWeight: "800",
                fontSize: 11,
                letterSpacing: 0.5,
              }}
            >
              ROLLOVER
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDone(task.id)}
            style={{
              flex: 1,
              backgroundColor: colors.forest,
              borderRadius: 14,
              height: 52,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
            }}
          >
            <MaterialIcons name="check" size={18} color="white" />
            <Text
              selectable
              allowFontScaling={false}
              style={{
                color: "white",
                fontWeight: "800",
                fontSize: 11,
                letterSpacing: 0.5,
              }}
            >
              STASH IT
            </Text>
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );
}
