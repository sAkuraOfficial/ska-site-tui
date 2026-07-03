import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { PostVo } from "../types";

const CACHE_DIR = join(process.cwd(), ".data");

function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cachePath(sourceId: string): string {
  return join(CACHE_DIR, `${sourceId}.json`);
}

/** 读取磁盘缓存，返回 null 表示无缓存或读取失败 */
export function readCache(sourceId: string): PostVo[] | null {
  try {
    const data = readFileSync(cachePath(sourceId), "utf-8");
    return JSON.parse(data) as PostVo[];
  } catch {
    return null;
  }
}

/** 写入磁盘缓存 */
export function writeCache(sourceId: string, posts: PostVo[]): void {
  try {
    ensureCacheDir();
    writeFileSync(cachePath(sourceId), JSON.stringify(posts, null, 2), "utf-8");
  } catch (e) {
    console.error(`缓存写入失败 (${sourceId}):`, e);
  }
}

// ── 文章全文内容缓存 ──

function articleCachePath(sourceId: string): string {
  return join(CACHE_DIR, `${sourceId}-articles.json`);
}

/** 读取文章全文缓存，返回 URL → HTML 的映射 */
export function readArticleCache(sourceId: string): Map<string, string> | null {
  try {
    const data = readFileSync(articleCachePath(sourceId), "utf-8");
    const obj = JSON.parse(data) as Record<string, string>;
    return new Map(Object.entries(obj));
  } catch {
    return null;
  }
}

/** 写入文章全文缓存 */
export function writeArticleCache(sourceId: string, articles: Map<string, string>): void {
  try {
    ensureCacheDir();
    const obj: Record<string, string> = {};
    articles.forEach((v, k) => (obj[k] = v));
    writeFileSync(articleCachePath(sourceId), JSON.stringify(obj), "utf-8");
  } catch (e) {
    console.error(`文章缓存写入失败 (${sourceId}):`, e);
  }
}
