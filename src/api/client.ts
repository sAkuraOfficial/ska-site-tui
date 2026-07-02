import ky from "ky";
import * as typeHalo from "./types";

const RSS_URL = "https://qaqbuyan.com:88/%E4%B9%94%E5%AE%89%E6%96%87%E7%AB%A0/rss";

// ========== RSS 解析工具 ==========

/** 去除 CDATA 包裹和首尾空白 */
function unescapeCdata(raw: string | undefined): string {
  return (raw ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

/** 从 RSS XML 中提取所有 <item> 原始块 */
function extractItems(xml: string): string[] {
  const items: string[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    items.push(m[1] ?? "");
  }
  return items;
}

/** 提取单个 XML 标签内的文本（支持 CDATA） */
function getTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? unescapeCdata(m[1] ?? "") : "";
}

/** 提取单个 XML 标签内的文本（保留原始内容，不 trim） */
function getTagRaw(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? unescapeCdata(m[1] ?? "") : "";
}

/** 提取所有同名子标签的值，如多个 <category> */
function getTags(block: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    results.push(unescapeCdata(m[1] ?? ""));
  }
  return results;
}

/** 从 description 的 HTML 中提取封面图 URL */
function extractCoverFromHtml(html: string): string | undefined {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1];
}

// ========== 缓存 ==========
let cachedItems: typeHalo.PostVo[] | null = null;

/** 拉取并解析 RSS，返回缓存的 PostVo[] */
async function fetchRssItems(): Promise<typeHalo.PostVo[]> {
  if (cachedItems) return cachedItems;

  const xml: string = await ky.get(RSS_URL).text();
  const rawItems = extractItems(xml);

  cachedItems = rawItems.map((block) => {
    const title = getTag(block, "title");
    const link = getTag(block, "link");
    const guid = getTag(block, "guid");
    const pubDate = getTag(block, "pubDate");
    const author = getTag(block, "author");
    const description = getTagRaw(block, "description");
    const categories = getTags(block, "category");
    const comments = getTag(block, "comments");

    // 从 guid 中提取 name（去掉前导 /乔安文章/ 前缀，取数字部分）
    const guidMatch = guid.match(/\/(\d+)\.html$/);
    const name = guidMatch ? (guidMatch[1] ?? "") : guid.replace(/\//g, "_");

    const cover = extractCoverFromHtml(description) ?? undefined;

    const post: typeHalo.PostVo = {
      metadata: {
        name,
        creationTimestamp: pubDate ? new Date(pubDate).toISOString() : undefined,
      },
      spec: {
        title,
        slug: name ?? "",
        cover: cover ?? undefined,
        deleted: false,
        publish: true,
        publishTime: pubDate ? new Date(pubDate).toISOString() : undefined,
        pinned: false,
        allowComment: true,
        visible: "PUBLIC",
        priority: 0,
        excerpt: {
          autoGenerate: false,
          raw: description,
        },
        categories,
      },
      status: {
        phase: "PUBLISHED",
        permalink: link,
        commentsCount: 0,
        excerpt: description,
      },
      content: {
        raw: description,
        content: description,
      },
      owner: {
        metadata: { name: author },
        displayName: author,
      },
      categories: categories.map((cat) => ({
        metadata: { name: cat },
        spec: { displayName: cat, slug: cat, priority: 0, hidden: false, hideFromList: false },
      })),
    };

    return post;
  });

  return cachedItems!;
}

// ========== 对外接口 ==========

/**
 * 查询文章列表方法
 * 支持 page / size 分页参数
 */
export async function queryPosts(params: typeHalo.QueryPostsParams = {}): Promise<typeHalo.ListedPostVoList> {
  try {
    const allPosts = await fetchRssItems();
    const page = params.page ?? 1;
    const size = params.size ?? 10;
    const total = allPosts.length;
    const totalPages = Math.ceil(total / size);
    const start = (page - 1) * size;
    const items = allPosts.slice(start, start + size);

    return {
      first: page === 1,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      items: items.map((post) => ({
        metadata: {
          name: post.metadata.name,
          creationTimestamp: post.metadata.creationTimestamp,
        },
        spec: {
          title: post.spec?.title ?? "",
          publishTime: post.spec?.publishTime,
        },
        owner: post.owner
          ? { displayName: post.owner.displayName, name: post.owner.name }
          : null,
      })),
      last: page === totalPages,
      page,
      size,
      total,
      totalPages,
    };
  } catch (error) {
    console.error("获取文章列表失败:", error);
    throw error;
  }
}

/**
 * 从文章 HTML 页面中提取 <article> 标签内的内容
 */
async function fetchArticleHtml(url: string): Promise<string> {
  try {
    const html: string = await ky.get(url).text();
    // 提取 <article>...</article> 内容
    const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
    if (articleMatch) {
      return articleMatch[1] ?? "";
    }
    // 备选：提取 id="article-content" 的 div
    const divMatch = /<div[^>]+id="article-content"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
    if (divMatch) {
      return divMatch[1] ?? "";
    }
    return html;
  } catch (e) {
    console.error(`抓取文章页面失败 (${url}):`, e);
    return "";
  }
}

// 文章 HTML 内容缓存
const articleHtmlCache = new Map<string, string>();

/**
 * 根据文章 name 查询单篇文章详情
 * @param name - guid 中的数字编号（如 "118"）
 */
export async function queryPostByName(name: string): Promise<typeHalo.PostVo> {
  try {
    const allPosts = await fetchRssItems();
    const post = allPosts.find((p) => p.metadata.name === name);
    if (!post) {
      throw new Error(`文章不存在: ${name}`);
    }

    // 从 RSS 中已有的 permalink 拼出文章 URL
    const link = post.status?.permalink;
    if (link) {
      // 检查缓存
      let fullHtml = articleHtmlCache.get(link);
      if (!fullHtml) {
        fullHtml = await fetchArticleHtml(link);
        articleHtmlCache.set(link, fullHtml);
      }
      // 将完整文章 HTML 塞入 content
      post.content = {
        raw: fullHtml,
        content: fullHtml,
      };
    }

    return post;
  } catch (error) {
    console.error(`获取文章详情失败 (name: ${name}):`, error);
    throw error;
  }
}

/**
 * 清除缓存，强制下次请求重新拉取 RSS
 */
export function clearRssCache(): void {
  cachedItems = null;
}