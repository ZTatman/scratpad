import { create } from 'zustand';
import { addDays, formatTime, isSameDay, setTime, todayKey } from '@/lib/date';
import { makeId } from '@/lib/id';
import { computeNextDueForRepeat } from '@/lib/task-logic';
import { buildBreakdownPrompt } from '@/reminders/messages';
import { evaluateReminderTick } from '@/reminders/scheduler';
import { parseSmsCommand } from '@/sms/command-parser';
import { BackendSmsTransport, MockSmsTransport } from '@/sms/client';
import { ackInboundAction, fetchInboundActions } from '@/sms/inbound-sync';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  loadStats,
  loadTasks,
  loadUiPrefs,
  saveSettings,
  saveStats,
  saveTasks,
  saveUiPrefs
} from '@/storage/persistence';
import { ReminderSettings, ReminderStats, RepeatType, Task } from '@/types/models';

const INBOUND_SYNC_COOLDOWN_MS = 3 * 60 * 1000;
const PROCESSED_ACTION_TTL_MS = 24 * 60 * 60 * 1000;
const PROCESSED_ACTION_MAX = 200;

export function shouldSyncInboundActions(nowMs: number, lastSyncAtMs: number): boolean {
  if (!lastSyncAtMs || lastSyncAtMs <= 0) return true;
  return nowMs - lastSyncAtMs >= INBOUND_SYNC_COOLDOWN_MS;
}

export function pruneProcessedInboundActions(
  processed: Record<string, number>,
  nowMs: number
): Record<string, number> {
  const entries = Object.entries(processed)
    .filter(([, ts]) => nowMs - ts <= PROCESSED_ACTION_TTL_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, PROCESSED_ACTION_MAX);
  return Object.fromEntries(entries);
}
function nowIso(): string {
  return new Date().toISOString();
}

// SMS replies usually don't include a task ID, so we default to the earliest pending task.
// This makes commands like "1" (DONE) behave predictably without extra user typing.
function pickTargetTask(tasks: Task[], taskId?: string): Task | undefined {
  if (taskId) return tasks.find((task) => task.id === taskId);
  return tasks
    .filter((task) => task.status === 'PENDING')
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
}

type AppState = {
  hydrated: boolean;
  onboardingDone: boolean;
  tasks: Task[];
  settings: ReminderSettings;
  stats: ReminderStats;
  deletedTask?: Task;
  activeBreakdownTaskId?: string;
  logs: string[];
  transport: 'backend' | 'mock';

  hydrate: () => Promise<void>;
  markOnboardingDone: () => Promise<void>;
  addTask: (input: { title: string; dueAt: Date; repeat: RepeatType }) => Promise<void>;
  setTaskDone: (taskId: string) => Promise<void>;
  rolloverTask: (taskId: string) => Promise<void>;
  undoRolloverTask: (taskId: string, previousDueAt: string, previousRolloverCount: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  updateTaskDueTime: (taskId: string, hours: number, minutes: number) => Promise<void>;
  saveReminderSettings: (settings: ReminderSettings) => Promise<void>;
  applySmsBody: (body: string) => Promise<void>;
  applyBreakdownReply: (body: string) => Promise<void>;
  runReminderTick: () => Promise<void>;
  syncInboundActions: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  onboardingDone: false,
  tasks: [],
  settings: DEFAULT_SETTINGS,
  stats: {
    dateKey: todayKey(),
    totalSentToday: 0,
    perTaskSentToday: {},
    lastSentAtMs: 0,
    quietHoursMessageSentToday: false,
    celebrationSentToday: false,
    snoozeUntilMs: 0,
    lastInboundSyncAtMs: 0,
    processedInboundActionIds: {}
  },
  logs: [],
  transport: process.env.EXPO_PUBLIC_USE_MOCK_SMS === '1' ? 'mock' : 'backend',

  async hydrate() {
    // Hydration loads every persisted slice up front so the UI can render from one consistent snapshot.
    const [tasks, settings, stats, ui] = await Promise.all([
      loadTasks(),
      loadSettings(),
      loadStats(),
      loadUiPrefs()
    ]);

    set({
      hydrated: true,
      tasks,
      settings,
      stats,
      onboardingDone: ui.onboardingDone,
      deletedTask: ui.deletedTask,
      activeBreakdownTaskId: ui.activeBreakdownTaskId
    });
  },

  async markOnboardingDone() {
    set({ onboardingDone: true });
    await saveUiPrefs({
      onboardingDone: true,
      deletedTask: get().deletedTask,
      activeBreakdownTaskId: get().activeBreakdownTaskId
    });
  },

  async addTask(input) {
    const now = nowIso();
    const task: Task = {
      id: makeId('task'),
      title: input.title.trim(),
      dueAt: input.dueAt.toISOString(),
      status: 'PENDING',
      repeat: input.repeat,
      rolloverCount: 0,
      createdAt: now,
      updatedAt: now
    };
    const tasks = [...get().tasks, task].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    set({ tasks });
    await saveTasks(tasks);
  },

  async setTaskDone(taskId) {
    const tasks = [...get().tasks];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return;

    const task = tasks[index];
    if (task.status === 'DONE') return;

    tasks[index] = { ...task, status: 'DONE', updatedAt: nowIso() };

    // Repeat behavior is completion-based: finishing one instance schedules the next one.
    if (task.repeat !== 'NONE') {
      tasks.push({
        ...task,
        id: makeId('task'),
        dueAt: computeNextDueForRepeat(task.dueAt, task.repeat),
        status: 'PENDING',
        rolloverCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    }

    tasks.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    set({ tasks });
    await saveTasks(tasks);
  },

  async rolloverTask(taskId) {
    const tasks = [...get().tasks];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return;

    const task = tasks[index];
    if (task.status === 'DONE') return;

    const nextDue = addDays(new Date(task.dueAt), 1);
    const rolloverCount = task.rolloverCount + 1;

    tasks[index] = {
      ...task,
      dueAt: nextDue.toISOString(),
      rolloverCount,
      updatedAt: nowIso()
    };

    // After 3 rollovers we mark this task for "break it down" flow.
    const activeBreakdownTaskId = rolloverCount >= 3 ? task.id : get().activeBreakdownTaskId;

    set({ tasks, activeBreakdownTaskId });
    await saveTasks(tasks);
    await saveUiPrefs({
      onboardingDone: get().onboardingDone,
      deletedTask: get().deletedTask,
      activeBreakdownTaskId
    });

    // Prompt the user by SMS to split an overloaded task into smaller subtasks.
    if (rolloverCount >= 3 && activeBreakdownTaskId) {
      const phone = get().settings.phoneNumber;
      const transport = get().transport === 'backend' ? new BackendSmsTransport() : new MockSmsTransport();
      const prompt = buildBreakdownPrompt(tasks[index]);
      try {
        if (phone) {
          await transport.sendMessage(phone, prompt, 'BREAKDOWN_PROMPT');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        set((state) => ({ logs: [...state.logs.slice(-100), `breakdown_prompt_failed:${message}`] }));
      }
    }
  },

  async undoRolloverTask(taskId, previousDueAt, previousRolloverCount) {
    const tasks = [...get().tasks];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return;

    tasks[index] = {
      ...tasks[index],
      dueAt: previousDueAt,
      rolloverCount: previousRolloverCount,
      updatedAt: nowIso()
    };

    const currentBreakdownTaskId = get().activeBreakdownTaskId;
    const activeBreakdownTaskId =
      currentBreakdownTaskId === taskId && previousRolloverCount < 3 ? undefined : currentBreakdownTaskId;

    set({ tasks, activeBreakdownTaskId });
    await saveTasks(tasks);
    await saveUiPrefs({
      onboardingDone: get().onboardingDone,
      deletedTask: get().deletedTask,
      activeBreakdownTaskId
    });
  },

  async deleteTask(taskId) {
    const tasks = [...get().tasks];
    const found = tasks.find((task) => task.id === taskId);
    if (!found) return;

    const nextTasks = tasks.filter((task) => task.id !== taskId);
    set({ tasks: nextTasks, deletedTask: found });
    await saveTasks(nextTasks);
    await saveUiPrefs({
      onboardingDone: get().onboardingDone,
      deletedTask: found,
      activeBreakdownTaskId: get().activeBreakdownTaskId
    });
  },

  async undoDelete() {
    const deletedTask = get().deletedTask;
    if (!deletedTask) return;

    const tasks = [...get().tasks, deletedTask].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    set({ tasks, deletedTask: undefined });
    await saveTasks(tasks);
    await saveUiPrefs({
      onboardingDone: get().onboardingDone,
      deletedTask: undefined,
      activeBreakdownTaskId: get().activeBreakdownTaskId
    });
  },

  async updateTaskDueTime(taskId, hours, minutes) {
    const tasks = [...get().tasks];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) return;
    const task = tasks[index];

    const updated = setTime(new Date(task.dueAt), hours, minutes);
    tasks[index] = { ...task, dueAt: updated.toISOString(), updatedAt: nowIso() };

    set({ tasks });
    await saveTasks(tasks);
  },

  async saveReminderSettings(settings) {
    set({ settings });
    await saveSettings(settings);
    await get().runReminderTick();
  },

  async applySmsBody(body) {
    const parsed = parseSmsCommand(body);
    const tasks = [...get().tasks];
    const target = pickTargetTask(tasks, 'taskId' in parsed ? parsed.taskId : undefined);

    switch (parsed.type) {
      case 'DONE': {
        if (target) {
          await get().setTaskDone(target.id);
        }
        break;
      }
      case 'ROLLOVER': {
        if (target) {
          await get().rolloverTask(target.id);
        }
        break;
      }
      case 'SNOOZE': {
        const defaultMinutes = get().settings.defaultSnoozeMinutes;
        const minutes = parsed.minutes && parsed.minutes > 0 ? parsed.minutes : defaultMinutes;
        const stats: ReminderStats = { ...get().stats, snoozeUntilMs: Date.now() + minutes * 60000 };
        set({ stats });
        await saveStats(stats);
        break;
      }
      case 'DONE_ALL': {
        // DONE_ALL only affects today's pending tasks (not future tasks).
        const nextTasks = [...tasks];
        const pendingToday = nextTasks.filter(
          (task) => task.status === 'PENDING' && isSameDay(new Date(task.dueAt), new Date())
        );

        for (const pendingTask of pendingToday) {
          const index = nextTasks.findIndex((task) => task.id === pendingTask.id);
          if (index < 0) continue;

          nextTasks[index] = {
            ...nextTasks[index],
            status: 'DONE',
            updatedAt: nowIso()
          };

          if (pendingTask.repeat !== 'NONE') {
            nextTasks.push({
              ...pendingTask,
              id: makeId('task'),
              dueAt: computeNextDueForRepeat(pendingTask.dueAt, pendingTask.repeat),
              status: 'PENDING',
              rolloverCount: 0,
              createdAt: nowIso(),
              updatedAt: nowIso()
            });
          }
        }

        nextTasks.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
        set({ tasks: nextTasks });
        await saveTasks(nextTasks);
        break;
      }
      case 'BREAKDOWN': {
        await get().applyBreakdownReply(body);
        break;
      }
      default:
        break;
    }
  },

  async applyBreakdownReply(body) {
    const parsed = parseSmsCommand(body);
    if (parsed.type !== 'BREAKDOWN') return;

    const parentTaskId = get().activeBreakdownTaskId;
    if (!parentTaskId) return;

    const tasks = [...get().tasks];
    const parentIndex = tasks.findIndex((task) => task.id === parentTaskId);
    if (parentIndex < 0) return;

    const parent = tasks[parentIndex];
    const base = new Date(parent.dueAt);

    // Subtasks inherit the parent date and are spaced by 15 minutes so they remain ordered.
    const subtasks = parsed.subtasks.map((title, index) => {
      const dueAt = new Date(base);
      dueAt.setMinutes(base.getMinutes() + index * 15);
      return {
        id: makeId('task'),
        title,
        dueAt: dueAt.toISOString(),
        status: 'PENDING' as const,
        repeat: 'NONE' as const,
        rolloverCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
    });

    const nextTasks = tasks.filter((task) => task.id !== parentTaskId).concat(subtasks);
    nextTasks.sort((a, b) => a.dueAt.localeCompare(b.dueAt));

    set({ tasks: nextTasks, activeBreakdownTaskId: undefined });
    await saveTasks(nextTasks);
    await saveUiPrefs({
      onboardingDone: get().onboardingDone,
      deletedTask: get().deletedTask,
      activeBreakdownTaskId: undefined
    });
  },

  async runReminderTick() {
    const state = get();
    const phone = state.settings.phoneNumber;
    const transport = state.transport === 'backend' ? new BackendSmsTransport() : new MockSmsTransport();

    // Centralized scheduler: every tick reevaluates guardrails + due tasks and returns updated counters.
    const { stats, logs } = await evaluateReminderTick({
      now: new Date(),
      tasks: state.tasks,
      settings: state.settings,
      stats: state.stats,
      phoneNumber: phone,
      transport
    });

    set({ stats, logs: [...state.logs.slice(-100), ...logs] });
    await saveStats(stats);

    await get().syncInboundActions();
  },

  async syncInboundActions() {
    const state = get();
    if (state.transport !== 'backend') return;
    const phone = state.settings.phoneNumber;
    if (!phone) return;
    const nowMs = Date.now();
    if (!shouldSyncInboundActions(nowMs, state.stats.lastInboundSyncAtMs)) return;

    let processedIds = pruneProcessedInboundActions(state.stats.processedInboundActionIds, nowMs);

    try {
      const actions = await fetchInboundActions(phone);
      if (actions.length > 0) {
        const actionFailureLogs: string[] = [];
        for (const action of actions) {
          // If already applied before, only ACK to clear server queue.
          if (processedIds[action.id]) {
            await ackInboundAction(phone, action.id);
            continue;
          }

          try {
            await get().applySmsBody(action.body);
            processedIds[action.id] = nowMs;
            processedIds = pruneProcessedInboundActions(processedIds, nowMs);
            await ackInboundAction(phone, action.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'unknown_error';
            actionFailureLogs.push(`sync_action_failed:${action.id}:${message}`);
          }
        }

        if (actionFailureLogs.length > 0) {
          set((current) => ({
            logs: [...current.logs.slice(-100), ...actionFailureLogs]
          }));
        }
      }

      const latest = get().stats;
      const nextStats: ReminderStats = {
        ...latest,
        lastInboundSyncAtMs: nowMs,
        processedInboundActionIds: processedIds
      };

      set((current) => ({
        stats: nextStats,
        logs: [...current.logs.slice(-100), `synced_inbound_actions:${actions.length}`]
      }));
      await saveStats(nextStats);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      const latest = get().stats;
      const nextStats: ReminderStats = {
        ...latest,
        lastInboundSyncAtMs: nowMs,
        processedInboundActionIds: processedIds
      };
      set((current) => ({
        stats: nextStats,
        logs: [...current.logs.slice(-100), `sync_inbound_failed:${message}`]
      }));
      await saveStats(nextStats);
    }
  }
}));

export const selectors = {
  todayTasks: (tasks: Task[]) => tasks.filter((task) => task.dueAt.slice(0, 10) === todayKey()),
  donePercent: (tasks: Task[]) => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((task) => task.status === 'DONE').length;
    return Math.round((done / tasks.length) * 100);
  },
  groupedDoneByDate: (tasks: Task[]) => {
    const done = tasks.filter((task) => task.status === 'DONE');
    return done.reduce<Record<string, Task[]>>((acc, task) => {
      const key = task.dueAt.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  },
  formatDueTime: (task: Task) => formatTime(new Date(task.dueAt))
};
