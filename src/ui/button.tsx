/** @jsxImportSource @opentui/solid */
import { TextAttributes, type RGBA } from "@opentui/core"
import { createSignal, type ParentProps } from "solid-js"
import { useTheme } from "../context/ThemeContext"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "small" | "medium" | "large"

export type ButtonProps = ParentProps<{
  /** 按钮变体，默认 "primary" */
  variant?: ButtonVariant
  /** 按钮尺寸，默认 "medium" */
  size?: ButtonSize
  /** 是否禁用 */
  disabled?: boolean
  /** 点击回调 */
  onClick?: () => void
  /** 自定义前景色 */
  fg?: RGBA
  /** 自定义背景色 */
  bg?: RGBA
  /** 自定义边框颜色 */
  borderColor?: RGBA
  /** 是否显示边框，默认 true */
  border?: boolean
  /** 是否处于焦点状态（由外部焦点管理控制） */
  focused?: boolean
}>

/**
 * Button 组件
 *
 * 终端 UI 中可点击的按钮，支持鼠标和键盘（Enter/Space）触发。
 *
 * @example
 * ```tsx
 * <Button onClick={() => console.log("clicked!")}>点击我</Button>
 * <Button variant="danger" onClick={handleDelete}>删除</Button>
 * <Button variant="ghost" size="small">Ghost</Button>
 * ```
 */
export function Button(props: ParentProps<ButtonProps>) {
  const { theme } = useTheme()
  const [hovered, setHovered] = createSignal(false)
  const [pressed, setPressed] = createSignal(false)

  const variant = () => props.variant ?? "primary"
  const size = () => props.size ?? "medium"
  const disabled = () => props.disabled ?? false

  // ── 尺寸映射 ──────────────────────────────────────────────────────────────
  const sizeStyles = () => {
    switch (size()) {
      case "small":
        return { paddingLeft: 1, paddingRight: 1, paddingTop: 0, paddingBottom: 0 }
      case "large":
        return { paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 }
      case "medium":
      default:
        return { paddingLeft: 2, paddingRight: 2, paddingTop: 0, paddingBottom: 0 }
    }
  }

  // ── 颜色映射 ──────────────────────────────────────────────────────────────
  const colors = () => {
    const v = variant()
    const isFocused = (props.focused ?? false) && !disabled()
    const isHovered = (hovered() || isFocused) && !disabled()
    const isPressed = pressed() && !disabled()

    if (disabled()) {
      return {
        fg: theme.textMuted,
        bg: undefined as RGBA | undefined,
        border: theme.border,
      }
    }

    switch (v) {
      case "primary":
        return {
          fg: isPressed ? theme.primary : isHovered ? theme.selectedListItemText : theme.primary,
          bg: isPressed ? undefined : isHovered ? theme.primary : undefined,
          border: isHovered ? theme.primary : theme.primary,
        }
      case "secondary":
        return {
          fg: isPressed ? theme.background : isHovered ? theme.background : theme.text,
          bg: isPressed ? theme.textMuted : isHovered ? theme.text : undefined,
          border: isPressed ? theme.textMuted : isHovered ? theme.text : theme.border,
        }
      case "ghost":
        return {
          fg: isPressed ? theme.selectedListItemText : isHovered ? theme.primary : theme.textMuted,
          bg: isPressed ? theme.primary : undefined,
          border: isPressed ? theme.primary : isHovered ? theme.primary : theme.border,
        }
      case "danger":
        return {
          fg: isPressed ? theme.error : isHovered ? theme.background : theme.error,
          bg: isPressed ? undefined : isHovered ? theme.error : undefined,
          border: isPressed ? theme.error : isHovered ? theme.error : theme.error,
        }
      default:
        return { fg: theme.text, bg: undefined as RGBA | undefined, border: theme.border }
    }
  }

  // ── 事件处理 ──────────────────────────────────────────────────────────────
  function handleClick() {
    if (disabled()) return
    props.onClick?.()
  }

  function handleKeyDown(key: { name: string }) {
    if (disabled()) return
    if (key.name === "return" || key.name === "space") {
      handleClick()
    }
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────
  return (
    <box
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      border={props.border !== false}
      borderColor={props.borderColor ?? colors().border}
      backgroundColor={props.bg ?? colors().bg}
      paddingLeft={sizeStyles().paddingLeft}
      paddingRight={sizeStyles().paddingRight}
      paddingTop={sizeStyles().paddingTop}
      paddingBottom={sizeStyles().paddingBottom}
      onMouseOver={() => !disabled() && setHovered(true)}
      onMouseOut={() => {
        setHovered(false)
        setPressed(false)
      }}
      onMouseDown={() => !disabled() && setPressed(true)}
      onMouseUp={() => {
        if (pressed() && !disabled()) {
          handleClick()
        }
        setPressed(false)
      }}
      onKeyDown={handleKeyDown}
      style={{
        opacity: disabled() ? 0.4 : 1,
      }}
    >
      <text
        fg={props.fg ?? colors().fg}
        attributes={(hovered() || props.focused) && !disabled() ? TextAttributes.BOLD : undefined}
        selectable={false}
      >
        {props.children}
      </text>
    </box>
  )
}
