import ky from "ky";
import type * as types from "../types";
import type { BlogAdapter, QueryPostsParams } from "./types";
import { readCache, writeCache } from "./cache";

export interface HaloAdapterConfig {
  baseUrl: string;
  auth?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟

// 每个 adapter 实例独立的缓存
const haloListCache = new Map<string, types.ListedPostVoList>();
const haloPostCache = new Map<string, types.PostVo>();
const lastFetchTime = new Map<string, number>();

export function createHaloAdapter(id: string, name: string, config: HaloAdapterConfig): BlogAdapter {
  const halo = ky.create({
    baseUrl: config.baseUrl,
    headers: config.auth ? { Authorization: config.auth } : {},
  });

  return {
    id,
    name,
    type: "halo",
    async queryPosts(params: QueryPostsParams = {}): Promise<types.ListedPostVoList> {
      const cacheKey = `${id}:posts:${JSON.stringify(params)}`;
      let cached = haloListCache.get(cacheKey);

      if (cached) {
        // 检查 TTL
        const lastFetch = lastFetchTime.get(cacheKey) ?? 0;
        if (Date.now() - lastFetch > CACHE_TTL_MS) {
          // 后台刷新
          halo
            .get("apis/api.content.halo.run/v1alpha1/posts", { searchParams: params as any })
            .json<types.ListedPostVoList>()
            .then((fresh) => {
              haloListCache.set(cacheKey, fresh);
              lastFetchTime.set(cacheKey, Date.now());
              writeCache(cacheKey, fresh.items as any);
            })
            .catch(() => {});
        }
        return cached;
      }

      // 尝试磁盘缓存
      const diskItems = readCache(cacheKey);
      if (diskItems) {
        // 磁盘缓存只有 items，需要重建 ListedPostVoList
        const disk: types.ListedPostVoList = {
          first: true, hasNext: false, hasPrevious: false,
          items: diskItems as any,
          last: true, page: params.page ?? 1, size: params.size ?? diskItems.length,
          total: diskItems.length, totalPages: 1,
        };
        haloListCache.set(cacheKey, disk);
        lastFetchTime.set(cacheKey, Date.now() - CACHE_TTL_MS); // 标记过期，触发后台刷新
        // 后台刷新
        halo
          .get("apis/api.content.halo.run/v1alpha1/posts", { searchParams: params as any })
          .json<types.ListedPostVoList>()
          .then((fresh) => {
            haloListCache.set(cacheKey, fresh);
            lastFetchTime.set(cacheKey, Date.now());
            writeCache(cacheKey, fresh.items as any);
          })
          .catch(() => {});
        return disk;
      }

      // 无缓存，同步请求
      const response = await halo
        .get("apis/api.content.halo.run/v1alpha1/posts", { searchParams: params as any })
        .json<types.ListedPostVoList>();
      haloListCache.set(cacheKey, response);
      lastFetchTime.set(cacheKey, Date.now());
      writeCache(cacheKey, response.items as any);
      return response;
    },
    async queryPostByName(name: string): Promise<types.PostVo> {
      const cacheKey = `${id}:post:${name}`;

      // 内存缓存
      const cached = haloPostCache.get(cacheKey);
      if (cached) {
        const lastFetch = lastFetchTime.get(cacheKey) ?? 0;
        if (Date.now() - lastFetch > CACHE_TTL_MS) {
          halo
            .get(`apis/api.content.halo.run/v1alpha1/posts/${name}`)
            .json<types.PostVo>()
            .then((fresh) => {
              haloPostCache.set(cacheKey, fresh);
              lastFetchTime.set(cacheKey, Date.now());
            })
            .catch(() => {});
        }
        return cached;
      }

      // 同步请求
      const response = await halo
        .get(`apis/api.content.halo.run/v1alpha1/posts/${name}`)
        .json<types.PostVo>();
      haloPostCache.set(cacheKey, response);
      lastFetchTime.set(cacheKey, Date.now());
      return response;
    },
  };
}
