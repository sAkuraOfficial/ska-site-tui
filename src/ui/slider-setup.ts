import { SliderRenderable } from "@opentui/core"
import { extend } from "@opentui/solid"

declare module "@opentui/solid" {
  interface OpenTUIComponents {
    slider: typeof SliderRenderable
  }
}

extend({ slider: SliderRenderable })
