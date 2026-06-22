import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  type ParentProps,
  type Accessor,
} from "solid-js";
import { useRenderer } from "@opentui/solid";

// ── Types ──────────────────────────────────────────────────────────────

type GroupId = string;

interface FocusManagerValue {
  /** 当前激活的组 ID（信号 accessor） */
  activeGroup: Accessor<GroupId>;
  /** 切换到下一个焦点组 */
  nextGroup: () => void;
  /** 切换到指定焦点组 */
  activateGroup: (id: GroupId) => void;
  /** 当前组内焦点下移 */
  focusNext: () => void;
  /** 当前组内焦点上移 */
  focusPrev: () => void;

  // ── 内部方法，供 useFocusGroup 调用 ──
  _registerGroup: (id: GroupId) => void;
  _registerItem: (groupId: GroupId, el: any) => number;
  _unregisterItem: (groupId: GroupId, el: any) => void;
  _isGroupActive: (groupId: GroupId) => boolean;
  /** 返回该组的焦点索引信号 accessor（响应式） */
  _getFocusedIndexSignal: (groupId: GroupId) => Accessor<number>;
}

// ── Context ────────────────────────────────────────────────────────────

const FocusManagerContext = createContext<FocusManagerValue>();

// ── Provider ───────────────────────────────────────────────────────────

export function FocusProvider(
  props: ParentProps & { groups?: GroupId[] }
) {
  const renderer = useRenderer();

  // 有序的组 ID 列表
  const groupOrder: GroupId[] = props.groups ? [...props.groups] : [];

  // 元素存储：groupId -> elements[]（纯数据，不需要响应式）
  const groupItems = new Map<GroupId, any[]>();

  // 焦点索引：groupId -> signal<number>（响应式！）
  const groupFocusIndices = new Map<GroupId, { get: Accessor<number>; set: (n: number) => void }>();

  // 当前激活的组（响应式）
  const [activeGroup, setActiveGroup] = createSignal<GroupId>(
    groupOrder[0] ?? ""
  );

  // 初始化预注册的组
  for (const id of groupOrder) {
    groupItems.set(id, []);
    const [get, set] = createSignal(0);
    groupFocusIndices.set(id, { get, set });
  }

  // ── 内部方法 ──

  function ensureGroup(id: GroupId) {
    if (!groupItems.has(id)) {
      groupItems.set(id, []);
      const [get, set] = createSignal(0);
      groupFocusIndices.set(id, { get, set });
      groupOrder.push(id);
      // 如果是第一个注册的组，设为激活
      if (groupOrder.length === 1) {
        setActiveGroup(id);
      }
    }
  }

  function _registerGroup(id: GroupId) {
    ensureGroup(id);
  }

  function _registerItem(groupId: GroupId, el: any): number {
    ensureGroup(groupId);
    const items = groupItems.get(groupId)!;
    const idx = items.length;
    items.push(el);
    return idx;
  }

  /** 从焦点组中移除元素，并修正焦点索引防止越界或偏移 */
  function _unregisterItem(groupId: GroupId, el: any) {
    const items = groupItems.get(groupId);
    if (!items) return;

    const removedIdx = items.indexOf(el);
    if (removedIdx === -1) return;

    items.splice(removedIdx, 1);

    // 修正焦点索引信号
    const signal = groupFocusIndices.get(groupId);
    if (!signal) return;

    const current = signal.get();
    if (items.length === 0) {
      // 组内已无元素，重置为 0
      signal.set(0);
    } else if (removedIdx < current) {
      // 被删除的元素在当前焦点之前 → 焦点位置前移一位，保持指向同一元素
      signal.set(current - 1);
    } else if (current >= items.length) {
      // 当前索引越界（被删除的恰好是末尾的聚焦项）→ 钳制到末尾
      signal.set(items.length - 1);
    }
    // 其他情况：被删除的元素在当前焦点之后，索引不受影响
  }

  function _isGroupActive(groupId: GroupId): boolean {
    return activeGroup() === groupId;
  }

  function _getFocusedIndexSignal(groupId: GroupId): Accessor<number> {
    ensureGroup(groupId);
    return groupFocusIndices.get(groupId)!.get;
  }

  // ── 辅助：获取当前组的焦点索引值并设置 ──

  function getCurrentIndex(groupId: GroupId): number {
    return groupFocusIndices.get(groupId)?.get() ?? 0;
  }

  function setCurrentIndex(groupId: GroupId, idx: number) {
    groupFocusIndices.get(groupId)?.set(idx);
  }

  // ── 公开方法 ──

  function nextGroup() {
    if (groupOrder.length === 0) return;
    const currentIdx = groupOrder.indexOf(activeGroup());
    const nextIdx = (currentIdx + 1) % groupOrder.length;
    const nextId = groupOrder[nextIdx]!;
    setActiveGroup(nextId);
    // 切换到新组时，聚焦该组的当前项
    const items = groupItems.get(nextId)!;
    if (items.length > 0) {
      const idx = getCurrentIndex(nextId);
      items[idx]?.focus?.();
    }
  }

  function activateGroup(id: GroupId) {
    if (groupItems.has(id)) {
      setActiveGroup(id);
      const items = groupItems.get(id)!;
      if (items.length > 0) {
        const idx = getCurrentIndex(id);
        items[idx]?.focus?.();
      }
    }
  }

  function focusNext() {
    const id = activeGroup();
    const items = groupItems.get(id);
    if (!items || items.length === 0) return;

    const newIdx = (getCurrentIndex(id) + 1) % items.length;
    setCurrentIndex(id, newIdx);
    items[newIdx]?.focus?.();
  }

  function focusPrev() {
    const id = activeGroup();
    const items = groupItems.get(id);
    if (!items || items.length === 0) return;

    const newIdx = (getCurrentIndex(id) - 1 + items.length) % items.length;
    setCurrentIndex(id, newIdx);
    items[newIdx]?.focus?.();
  }

  // ── 键盘处理（集中在此处）──

  const keyHandler = (key: { name: string; ctrl?: boolean; shift?: boolean }) => {
    // Ctrl 组合键不处理焦点导航
    if (key.ctrl) return;

    if (key.name === "tab") {
      nextGroup();
    } else if (key.name === "down" || key.name === "j") {
      focusNext();
    } else if (key.name === "up" || key.name === "k") {
      focusPrev();
    }
  };

  onMount(() => {
    renderer.keyInput.on("keypress", keyHandler);
  });

  onCleanup(() => {
    renderer.keyInput.removeListener("keypress", keyHandler);
  });

  // ── Context value ──

  const value: FocusManagerValue = {
    activeGroup,
    nextGroup,
    activateGroup,
    focusNext,
    focusPrev,
    _registerGroup,
    _registerItem,
    _unregisterItem,
    _isGroupActive,
    _getFocusedIndexSignal,
  };

  return (
    <FocusManagerContext.Provider value={value}>
      {props.children}
    </FocusManagerContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────

/**
 * 获取全局焦点管理器（用于 nextGroup 等全局操作）
 */
export function useFocusManager(): FocusManagerValue {
  const ctx = useContext(FocusManagerContext);
  if (!ctx) {
    throw new Error("useFocusManager must be used within a FocusProvider");
  }
  return ctx;
}

/**
 * 获取指定焦点组的操作接口
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { registerItem, isActive, focusedIndex } = useFocusGroup("sidebar");
 *
 *   return (
 *     <box ref={(el) => registerItem(el)}>
 *       <Button focused={focusedIndex() === 0}>提交</Button>
 *     </box>
 *   );
 * }
 * ```
 */
export function useFocusGroup(groupId: GroupId) {
  const manager = useFocusManager();

  // 确保组已注册
  manager._registerGroup(groupId);

  /**
   * 将一个元素注册到此焦点组中，并在组件销毁时自动注销。
   * 在 ref 回调中调用：`ref={(el) => registerItem(el)}`
   *
   * SolidJS 的 ref 回调在元素销毁时会传入 null/undefined，
   * 配合 onCleanup 确保动态增删时焦点数据始终干净。
   */
  function registerItem(el: any) {
    if (!el) return; // 元素被销毁时 Solid 传入 null，直接拦截

    manager._registerItem(groupId, el);

    // 组件销毁时自动从焦点组中剔除该元素
    onCleanup(() => {
      manager._unregisterItem(groupId, el);
    });
  }

  /** 此组是否为当前激活的焦点组（读取 activeGroup 信号，响应式） */
  function isActive(): boolean {
    return manager._isGroupActive(groupId);
  }

  /**
   * 此组内当前聚焦的元素索引。
   * 返回的是信号 accessor 的调用结果，在 JSX 追踪上下文中会自动订阅变更。
   */
  function focusedIndex(): number {
    return manager._getFocusedIndexSignal(groupId)();
  }

  return {
    registerItem,
    isActive,
    focusedIndex,
  };
}
