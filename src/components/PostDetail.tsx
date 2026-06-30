import { createResource } from "solid-js";
import type { ListedPostVo } from "../api/types";
import { postToMarkdown } from "../lib/postToMarkdown";
import { SyntaxStyle, parseColor } from "@opentui/core";
import { useTheme } from "../context/ThemeContext";
import { generateSyntax } from "../theme";

type PostDetailProps = {
  post: ListedPostVo;
  handleClose: () => void;
};

export default function PostDetail(props: PostDetailProps) {
  const { post, handleClose } = props;
  const { theme } = useTheme();

  const [markdown] = createResource<string>(async () => {
    var sb = await postToMarkdown(post);
    // console.log("markdown:", sb);
    return sb;
  });

  // const syntaxStyle = SyntaxStyle.fromStyles({
  //   keyword: { fg: parseColor("#FF7B72"), bold: true },
  //   string: { fg: parseColor("#A5D6FF") },
  //   comment: { fg: parseColor("#8B949E"), italic: true },
  //   number: { fg: parseColor("#79C0FF") },
  //   function: { fg: parseColor("#D2A8FF") },
  //   type: { fg: parseColor("#FFA657") },
  //   operator: { fg: parseColor("#FF7B72") },
  //   variable: { fg: parseColor("#E6EDF3") },
  //   property: { fg: parseColor("#79C0FF") },
  //   "punctuation.bracket": { fg: parseColor("#F0F6FC") },
  //   "punctuation.delimiter": { fg: parseColor("#C9D1D9") },
  //   "markup.heading": { fg: parseColor("#58A6FF"), bold: true },
  //   "markup.heading.1": { fg: parseColor("#00FF88"), bold: true },
  //   "markup.heading.2": { fg: parseColor("#00D7FF"), bold: true },
  //   "markup.heading.3": { fg: parseColor("#FF69B4") },
  //   "markup.bold": { fg: parseColor("#F0F6FC"), bold: true },
  //   "markup.strong": { fg: parseColor("#F0F6FC"), bold: true },
  //   "markup.italic": { fg: parseColor("#F0F6FC"), italic: true },
  //   "markup.list": { fg: parseColor("#FF7B72") },
  //   "markup.quote": { fg: parseColor("#8B949E"), italic: true },
  //   "markup.raw": { fg: parseColor("#A5D6FF"), bg: parseColor("#161B22") },
  //   "markup.raw.block": {
  //     fg: parseColor("#A5D6FF"),
  //     bg: parseColor("#161B22"),
  //   },
  //   "markup.raw.inline": {
  //     fg: parseColor("#A5D6FF"),
  //     bg: parseColor("#161B22"),
  //   },
  //   "markup.link": { fg: parseColor("#58A6FF"), underline: true },
  //   "markup.link.label": { fg: parseColor("#A5D6FF"), underline: true },
  //   "markup.link.url": { fg: parseColor("#58A6FF"), underline: true },
  //   "diff.plus": { fg: parseColor("#3FB950") },
  //   "diff.minus": { fg: parseColor("#F85149") },
  //   label: { fg: parseColor("#7EE787") },
  //   conceal: { fg: parseColor("#6E7681") },
  //   "punctuation.special": { fg: parseColor("#8B949E") },
  //   default: { fg: parseColor("#E6EDF3") },
  // });

  return (
    <scrollbox
      style={{
        flexGrow: 1,
        flexShrink: 1,
        height: "100%",
        backgroundColor: theme.background,
        padding: 1,
        scrollY: true,
      }}
      contentOptions={{
        flexGrow: 0,
        minWidth: "0%",
      }}
    >
      <markdown
        content={markdown()}
        syntaxStyle={generateSyntax(theme)}
        fg={theme.text}
        // bg="#0D1117"
        conceal={true}
        internalBlockMode="top-level"
        // width="100%"
        tableOptions={{
          style: "grid",
          widthMode: "content",
          columnFitter: "balanced",
          wrapMode: "word",
          cellPadding: 0,
          borders: true,
          outerBorder: true,
          borderStyle: "single",
          borderColor: theme.text,
          selectable: true,
        }}
      />
    </scrollbox>
  );
}
