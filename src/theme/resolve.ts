import { RGBA } from "@opentui/core"
import type { Theme, ThemeJson, ThemeColor, ColorValue } from "./types"

/**
 * Convert an ANSI color code (0-255) to RGBA.
 *
 * Supports:
 *  - Standard colors   (0-15)
 *  - 6×6×6 color cube  (16-231)
 *  - Grayscale ramp     (232-255)
 */
export function ansiToRgba(code: number): RGBA {
  // Standard ANSI colors (0-15)
  if (code < 16) {
    const ansiColors = [
      "#000000",
      "#800000",
      "#008000",
      "#808000",
      "#000080",
      "#800080",
      "#008080",
      "#c0c0c0",
      "#808080",
      "#ff0000",
      "#00ff00",
      "#ffff00",
      "#0000ff",
      "#ff00ff",
      "#00ffff",
      "#ffffff",
    ]
    return RGBA.fromHex(ansiColors[code] ?? "#000000")
  }

  // 6×6×6 Color Cube (16-231)
  if (code < 232) {
    const index = code - 16
    const b = index % 6
    const g = Math.floor(index / 6) % 6
    const r = Math.floor(index / 36)
    const val = (x: number) => (x === 0 ? 0 : x * 40 + 55)
    return RGBA.fromInts(val(r), val(g), val(b))
  }

  // Grayscale Ramp (232-255)
  if (code < 256) {
    const gray = (code - 232) * 10 + 8
    return RGBA.fromInts(gray, gray, gray)
  }

  return RGBA.fromInts(0, 0, 0)
}

/**
 * Linearly interpolate (tint) a base color towards an overlay color.
 *
 * @param base    – starting color
 * @param overlay – color to blend towards
 * @param alpha   – blend factor 0‥1 (0 = pure base, 1 = pure overlay)
 */
export function tint(base: RGBA, overlay: RGBA, alpha: number): RGBA {
  const r = base.r + (overlay.r - base.r) * alpha
  const g = base.g + (overlay.g - base.g) * alpha
  const b = base.b + (overlay.b - base.b) * alpha
  return RGBA.fromInts(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
}

/**
 * Resolve a theme JSON to concrete RGBA values for a given mode (dark | light).
 *
 * Color references are resolved in this order:
 *   1. Direct RGBA instance → passthrough
 *   2. "transparent" / "none" → fully transparent black
 *   3. Hex string "#rrggbb" → parsed directly
 *   4. RefName → looked up in `defs`, then in the theme itself (for self-references)
 *   5. Numeric value → treated as an ANSI color code
 *   6. Variant `{ dark, light }` → the entry for the current `mode` is resolved recursively
 */
export function resolveTheme(theme: ThemeJson, mode: "dark" | "light"): Theme {
  const defs = theme.defs ?? {}

  function resolveColor(c: ColorValue): RGBA {
    // 1. Already an RGBA – return as-is
    if (c instanceof RGBA) return c

    if (typeof c === "string") {
      // 2. Transparent shortcuts
      if (c === "transparent" || c === "none") return RGBA.fromInts(0, 0, 0, 0)

      // 3. Hex color
      if (c.startsWith("#")) return RGBA.fromHex(c)

      // 4. Reference name – look up in defs first
      if (defs[c] != null) {
        return resolveColor(defs[c])
      }

      // 4b. Reference name – look up in the theme itself (self-references)
      const themeColor = theme.theme[c as ThemeColor]
      if (themeColor !== undefined) {
        return resolveColor(themeColor)
      }

      throw new Error(`Color reference "${c}" not found in defs or theme`)
    }

    // 5. Numeric ANSI code
    if (typeof c === "number") {
      return ansiToRgba(c)
    }

    // 6. Variant – pick the side matching the current mode
    return resolveColor(c[mode])
  }

  // Resolve every standard theme color
  const resolved = Object.fromEntries(
    Object.entries(theme.theme)
      .filter(
        ([key]) =>
          key !== "selectedListItemText" &&
          key !== "backgroundMenu" &&
          key !== "thinkingOpacity",
      )
      .map(([key, value]) => [key, resolveColor(value as ColorValue)]),
  ) as Partial<Record<ThemeColor, RGBA>>

  // Handle selectedListItemText (optional – falls back to background)
  const selectedListItemTextValue = theme.theme.selectedListItemText
  const hasSelectedListItemText = selectedListItemTextValue !== undefined
  if (hasSelectedListItemText) {
    resolved.selectedListItemText = resolveColor(selectedListItemTextValue)
  } else if (resolved.background !== undefined) {
    resolved.selectedListItemText = resolved.background
  }

  // Handle backgroundMenu (optional – falls back to backgroundElement)
  if (theme.theme.backgroundMenu !== undefined) {
    resolved.backgroundMenu = resolveColor(theme.theme.backgroundMenu)
  } else if (resolved.backgroundElement !== undefined) {
    resolved.backgroundMenu = resolved.backgroundElement
  }

  // Handle thinkingOpacity (optional – default 0.6)
  const thinkingOpacity = theme.theme.thinkingOpacity ?? 0.6

  return {
    ...resolved,
    _hasSelectedListItemText: hasSelectedListItemText,
    thinkingOpacity,
  } as Theme
}

/**
 * Determine the foreground color to use for selected list items.
 *
 * Priority:
 *   1. If the theme explicitly defines `selectedListItemText`, use it.
 *   2. If the background is transparent, compute a contrasting black/white based
 *      on the provided `bg` (or fall back to `theme.primary`).
 *   3. Otherwise, return the theme background (same color = invisible text,
 *      which is the expected OpenCode behavior for themes that don't set this).
 */
export function selectedForeground(theme: Theme, bg?: RGBA): RGBA {
  // If theme explicitly defines selectedListItemText, use it
  if (theme._hasSelectedListItemText) {
    return theme.selectedListItemText
  }

  // For transparent backgrounds, calculate contrast based on the actual bg
  // (or fallback to primary)
  if (theme.background.a === 0) {
    const targetColor = bg ?? theme.primary
    const { r, g, b } = targetColor
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return luminance > 0.5 ? RGBA.fromInts(0, 0, 0) : RGBA.fromInts(255, 255, 255)
  }

  // Fall back to background color
  return theme.background
}
