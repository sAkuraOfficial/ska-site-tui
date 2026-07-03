# PostList 关闭文章详情后自动聚焦

## 需求

关闭文章详情（`showPost` 从 `非null → null`）后，回到文章列表时自动聚焦到当前选中的卡片。

## 项目结构关键点

`MainContent.tsx` 中，`PostList` 和 `PostDetail` 通过 `<Show>` **互斥渲染**：

```tsx
<Show when={showPost() != null}>
  <PostDetail ... />
</Show>
<Show when={showPost() == null}>
  <PostList ... />
</Show>
```

**这意味着 `PostList` 在打开文章时被卸载，关闭文章时被重新挂载（全新组件实例）。**

---

## ❌ 踩坑方案

### 方案 1：`let` 变量 + `createEffect` 手动追踪前值

```tsx
let prevShowPost: any = postcontext.showPost();
createEffect(() => {
  const current = postcontext.showPost();
  if (prevShowPost !== null && current === null) {
    focusCard(focusedIndex());
  }
  prevShowPost = current;
});
```

**问题**：`prevShowPost` 始终是 `null`。因为 `PostList` 是被 `<Show>` 条件渲染的，每次关闭文章回来都是全新挂载，`let` 变量初始值永远是 `null`。

### 方案 2：SolidJS `on()` 辅助函数

```tsx
createEffect(
  on(
    () => postcontext.showPost(),
    (current, prev) => {
      if (prev != null && current == null) {
        focusCard(focusedIndex());
      }
    },
  ),
);
```

**问题**：SolidJS `on()` 的第二个参数 `prev` 是**回调函数上一次返回值**，不是 signal 的前值。由于回调返回 `void`，`prev` 始终是 `undefined`。

### 方案 3：在 `PostList` 内监听 `showPost` 变化

引入 `usePostContext`，试图在 `PostList` 组件内部检测 `showPost` 变化。

**问题**：同方案 1，`PostList` 被卸载后重新挂载，无法感知之前的状态。且移除导入后残留了 `const postcontext = usePostContext()` 导致 `ReferenceError`。

---

## ✅ 最终方案：利用 PostList 挂载时机

**核心思路**：既然 `PostList` 每次挂载就意味着"从文章详情返回"，那就不需要追踪 `showPost` 的变化，只需要在挂载时正确聚焦即可。

```tsx
onMount(() => {
  renderer.keyInput.on("keypress", handleKey);
  // PostList 每次挂载都是从文章详情返回，延迟一帧确保卡片 refs 已挂载
  if (props.posts.length > 0) {
    setTimeout(() => focusCard(focusedIndex()), 0);
  }
});
```

**为什么需要 `setTimeout`**：`onMount` 触发时，子组件的 `ref` 可能还未全部赋值到 `cardRefs` Map 中。`setTimeout(fn, 0)` 将聚焦推到下一个微任务，确保所有卡片的 `ref` 回调已执行完毕。

---

## 关键结论

| 场景 | 正确做法 |
|------|---------|
| 组件始终存活（不被卸载） | 用 `let` 变量或 `on()` 在 effect 中追踪前值 |
| 组件被 `<Show>` / `<Suspense>` 条件渲染导致卸载重建 | 利用 `onMount` 处理"首次出现"的逻辑 |

**SolidJS 的 `on()` 的 `prev` 参数是回调返回值的前值，不是 signal 的前值。** 如需追踪 signal 前值，应使用 `let` 变量或 `createMemo` 手动实现。

---

# 友链切换博客源时崩溃

## 需求

在 Sidebar 友链面板点击切换博客源时，PostList 需要加载新源的文章列表。切换过程中需要先关闭当前打开的文章详情（`showPost → null`），再更新数据源（`currentSource → 新源`）。

## 踩坑过程

### 坑 1：切换源后用旧文章 ID 请求新源 → 404 崩溃

**现象**：在第三方站点（如 qaqbuyan）打开一篇文章，然后在友链点击"回到主站"，程序崩溃。

**原因**：`createEffect` 同时追踪 `showPost()` 和 `currentSource()`。切换源时，effect 重新运行，此时 `showPost()` 可能仍持有旧文章，`currentSource()` 已变为新源，导致用旧文章 ID 去请求新源的 API（如用 qaqbuyan 的文章 ID `117` 请求 Halo 端点），返回 404。

**最初尝试的错误修复**：
- 在 effect 的异步回调中加 `currentSource() !== sourceId` 检查 → 无效，因为 `postToMarkdown` 在 effect 同步阶段就已经用错误的 source 发起了请求
- 用 `isPostOpen()` 派生信号替代多次 `showPost()` 读取 → 引入新的 stale read 问题

### 坑 2：多个 `<Show>` 分别读取同一信号 → Stale Read 警告

**现象**：`MainContent.tsx` 中有多个 `<Show when={showPost() == null}>` 和 `<Show when={showPost() != null}>`，切换时控制台输出 `Stale read from <Show>`。

**原因**：SolidJS 的 `<Show>` 每个都有独立的追踪作用域。同一轮更新中，不同 `<Show>` 可能看到信号的不同值。

**尝试的错误修复**：
- 引入 `isPostOpen()` 派生信号统一读取 → 仍然有 stale read
- 用 `<Switch>/<Match>` 替代多个 `<Show>` → 虽然解决了 stale read，但导致 opentui 渲染器 segfault 崩溃

### 坑 3：opentui 渲染器需要帧间隔处理组件卸载

**现象**：即使用 `setShowPost(null)` + `setCurrentSource()` 按正确顺序调用，bun 进程仍然 segfault 崩溃（opentui.dll 地址错误）。

**原因**：opentui 的原生渲染器在同步代码中连续处理「组件卸载」+「资源重新拉取触发重渲染」时，内部状态出现竞争条件导致崩溃。

---

## ✅ 最终方案：setTimeout 延迟一帧

**核心思路**：先清空文章（`setShowPost(null)`），延迟一帧后再切换数据源（`setCurrentSource()`），给渲染器时间处理卸载。

```tsx
// Sidebar.tsx
onMouseDown={() => {
  setShowPost(null);
  setTimeout(() => setCurrentSource(source.id), 0);
}}
```

**同时在 MainContent effect 中加保护**：即使时序出问题，异步回调也会丢弃过期结果。

```tsx
// MainContent.tsx
createEffect(() => {
  const post = showPost();
  const sourceId = currentSource();
  if (post) {
    postToMarkdown(post, sourceId).then((md) => {
      // 切源或关文后，忽略过期的结果
      if (currentSource() !== sourceId || showPost()?.metadata.name !== post.metadata.name) return;
      // ...更新 context
    });
  }
  // ...
});
```

---

## 关键结论

| 场景 | 正确做法 |
|------|---------|
| opentui 中组件卸载后立即触发重渲染 | 用 `setTimeout(fn, 0)` 延迟一帧，让渲染器先处理卸载 |
| 异步操作依赖多个信号的快照 | 在发起时捕获信号值，回调中检查是否仍匹配 |
| 多个 `<Show>` 读取同一信号 | SolidJS 原生 `<Show>` 会有 stale read 警告，但 `<Switch>/<Match>` 在 opentui 中可能导致崩溃，暂时保留 `<Show>` |

**opentui 渲染器在同步代码中连续处理卸载 + 重渲染时容易 segfault。`setTimeout` 是目前最可靠的规避方式。**
