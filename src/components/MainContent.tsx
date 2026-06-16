/** @jsxImportSource @opentui/solid */
import { useTheme } from "../context/ThemeContext";
// @ts-ignore
import gifSrc from "../assets/e1480db31caad4ac819f5d777930218f.gif" with { type: "image/gif" };
import { GifPlayer } from "./GifPlayer";
// @ts-ignore
import testImage from "../assets/2d18dd1d592c95081453b57d2c390b38.jpg" with { type: "image/jpeg" };
import { Image } from "./Image";

export function MainContent() {
  const { theme } = useTheme();

  return (
    <scrollbox
      style={{
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: "auto",
        minWidth: 20,
        height: "auto",
        backgroundColor: theme.background,
        alignItems: "stretch",
        justifyContent: "flex-start",
        margin: 0,
        padding: 0,
        scrollY: true,
      }}
    >
      <Image src={testImage} width={100} />
      <GifPlayer
        src={gifSrc}
        width={64}
        bgColor={theme.background.toString()}
      />
    </scrollbox>
  );
}
