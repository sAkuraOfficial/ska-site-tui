import TurndownService from "turndown";
// @ts-ignore 如果插件没有自带类型声明，可以用 ts-ignore 或自行声明
import { gfm } from "turndown-plugin-gfm";
import type { ListedPostVo } from "../api/types";
import { queryPostByName } from "../api/client";

// 1. 初始化 Turndown 实例
const turndownService = new TurndownService({
  headingStyle: "atx", // 使用 # 号表示标题
  codeBlockStyle: "fenced", // 使用 ``` 表示代码块
});

// 2. 使用 GFM 插件（支持删除线 <s>、任务列表、表格等）
turndownService.use(gfm);

// 3. 自定义规则（可选）：处理你 HTML 中特殊的标签
// 例如：你的代码块带有 class="language-cpp"，我们希望把语言提取出来
turndownService.addRule("fencedCodeBlock", {
  filter: function (node): boolean {
    return (
      node.nodeName === "PRE" &&
      !!node.firstChild &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (content, node) {
    const codeElem = node.firstChild as HTMLElement;
    // 提取 class 中的语言，比如 "language-cpp" -> "cpp"
    const className = codeElem.getAttribute("class") || "";
    const language = className.replace(/language-/, "");

    // 保证内容前后有换行
    return `\n\`\`\`${language}\n${codeElem.textContent}\n\`\`\`\n`;
  },
});

export async function postToMarkdown(post: ListedPostVo): Promise<string> {
  const detail = await queryPostByName(post.metadata.name);
  const htmlContent = detail.content?.content;
  if (!htmlContent) {
    return ""; // 如果没有内容，返回空字符串
  }
  const markdown = turndownService.turndown(htmlContent);
  return markdown;
}
