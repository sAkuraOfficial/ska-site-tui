import { RGBA, type SyntaxStyle, type ThemeTokenStyle } from "@opentui/core"
import { type Theme, type ThemeJson, type ThemeColor, type SyntaxStyleOverrides } from "./types"
import { resolveTheme, ansiToRgba, tint, selectedForeground } from "./resolve"
import { generateSyntax, generateSubtleSyntax } from "./syntax"

// Import all theme assets
import aura from "./assets/aura.json" with { type: "json" }
import ayu from "./assets/ayu.json" with { type: "json" }
import carbonfox from "./assets/carbonfox.json" with { type: "json" }
import catppuccinFrappe from "./assets/catppuccin-frappe.json" with { type: "json" }
import catppuccinMacchiato from "./assets/catppuccin-macchiato.json" with { type: "json" }
import catppuccin from "./assets/catppuccin.json" with { type: "json" }
import cobalt2 from "./assets/cobalt2.json" with { type: "json" }
import cursor from "./assets/cursor.json" with { type: "json" }
import dracula from "./assets/dracula.json" with { type: "json" }
import everforest from "./assets/everforest.json" with { type: "json" }
import flexoki from "./assets/flexoki.json" with { type: "json" }
import github from "./assets/github.json" with { type: "json" }
import gruvbox from "./assets/gruvbox.json" with { type: "json" }
import kanagawa from "./assets/kanagawa.json" with { type: "json" }
import lucentOrng from "./assets/lucent-orng.json" with { type: "json" }
import material from "./assets/material.json" with { type: "json" }
import matrix from "./assets/matrix.json" with { type: "json" }
import mercury from "./assets/mercury.json" with { type: "json" }
import monokai from "./assets/monokai.json" with { type: "json" }
import nightowl from "./assets/nightowl.json" with { type: "json" }
import nord from "./assets/nord.json" with { type: "json" }
import onedark from "./assets/one-dark.json" with { type: "json" }
import opencode from "./assets/opencode.json" with { type: "json" }
import orng from "./assets/orng.json" with { type: "json" }
import osakaJade from "./assets/osaka-jade.json" with { type: "json" }
import palenight from "./assets/palenight.json" with { type: "json" }
import rosepine from "./assets/rosepine.json" with { type: "json" }
import solarized from "./assets/solarized.json" with { type: "json" }
import synthwave84 from "./assets/synthwave84.json" with { type: "json" }
import tokyonight from "./assets/tokyonight.json" with { type: "json" }
import vercel from "./assets/vercel.json" with { type: "json" }
import vesper from "./assets/vesper.json" with { type: "json" }
import zenburn from "./assets/zenburn.json" with { type: "json" }

// Re-export types
export type { Theme, ThemeJson, ThemeColor, SyntaxStyleOverrides } from "./types"
export { resolveTheme, ansiToRgba, tint, selectedForeground } from "./resolve"
export { generateSyntax, generateSubtleSyntax } from "./syntax"

// Default themes registry
export const DEFAULT_THEMES: Record<string, ThemeJson> = {
  aura,
  ayu,
  catppuccin,
  ["catppuccin-frappe"]: catppuccinFrappe,
  ["catppuccin-macchiato"]: catppuccinMacchiato,
  cobalt2,
  cursor,
  dracula,
  everforest,
  flexoki,
  github,
  gruvbox,
  kanagawa,
  material,
  matrix,
  mercury,
  monokai,
  nightowl,
  nord,
  ["one-dark"]: onedark,
  ["osaka-jade"]: osakaJade,
  opencode,
  orng,
  ["lucent-orng"]: lucentOrng,
  palenight,
  rosepine,
  solarized,
  synthwave84,
  tokyonight,
  vesper,
  vercel,
  zenburn,
  carbonfox,
}

// Custom themes storage
let customThemes: Record<string, ThemeJson> = {}
const listeners = new Set<(themes: Record<string, ThemeJson>) => void>()

function listThemes(): Record<string, ThemeJson> {
  return {
    ...DEFAULT_THEMES,
    ...customThemes,
  }
}

function syncThemes() {
  const themes = listThemes()
  for (const listener of listeners) listener(themes)
}

/**
 * Get all available themes
 */
export function allThemes(): Record<string, ThemeJson> {
  return listThemes()
}

/**
 * Check if a theme exists
 */
export function hasTheme(name: string): boolean {
  if (!name) return false
  return allThemes()[name] !== undefined
}

/**
 * Validate if an object is a valid ThemeJson
 */
export function isTheme(theme: unknown): theme is ThemeJson {
  if (typeof theme !== "object" || theme === null || Array.isArray(theme)) return false
  const value = Reflect.get(theme, "theme")
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Subscribe to theme changes
 */
export function subscribeThemes(listener: (themes: Record<string, ThemeJson>) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Set custom themes (replaces all custom themes)
 */
export function setCustomThemes(themes: Record<string, ThemeJson>): void {
  customThemes = themes
  syncThemes()
}

/**
 * Add a new custom theme
 */
export function addTheme(name: string, theme: unknown): boolean {
  if (!name) return false
  if (!isTheme(theme)) return false
  if (hasTheme(name)) return false
  customThemes[name] = theme
  syncThemes()
  return true
}

/**
 * Update or insert a theme
 */
export function upsertTheme(name: string, theme: unknown): boolean {
  if (!name) return false
  if (!isTheme(theme)) return false
  if (customThemes[name] !== undefined) {
    customThemes[name] = theme
  } else {
    customThemes[name] = theme
  }
  syncThemes()
  return true
}

/**
 * Detect terminal mode from background color luminance
 */
export function terminalMode(colors: { defaultBackground?: string }): "dark" | "light" | undefined {
  if (!colors.defaultBackground) return undefined
  const bg = RGBA.fromHex(colors.defaultBackground)
  const { r, g, b } = bg
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.5 ? "light" : "dark"
}
