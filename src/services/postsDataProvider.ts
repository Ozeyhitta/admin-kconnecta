import type { DataProvider } from "ra-core";
import { apiClient } from "./axiosInstance";
import { getPageContent, getPageTotal } from "./pagination";

type PostMethods = Pick<DataProvider, "getList" | "getOne" | "update" | "delete">;

// A shared-post row carries a composite id "share:<uuid>" so the single "posts"
// resource can route Show/Delete to the dedicated /post-shares endpoints.
const SHARE_ID_PREFIX = "share:";
const isShareId = (id: unknown): boolean =>
  typeof id === "string" && id.startsWith(SHARE_ID_PREFIX);
const shareUuid = (id: unknown): string => String(id).slice(SHARE_ID_PREFIX.length);

export const postsDataProvider: PostMethods = {
  getList: async (_resource, params) => {
    const { page = 1, perPage = 20 } = params.pagination ?? {};
    const { field = "updatedAt", order = "DESC" } = params.sort ?? {};
    const { q, status, authorId, createdFrom, createdTo, postType } = params.filter ?? {};

    const { data } = await apiClient.get("/api/v1/admin/posts", {
      params: {
        page: page - 1,
        size: perPage,
        sortBy: field,
        sortDir: order.toLowerCase(),
        ...(q ? { search: q } : {}),
        ...(status ? { status } : {}),
        ...(authorId ? { authorId } : {}),
        ...(createdFrom ? { createdFrom } : {}),
        ...(createdTo ? { createdTo } : {}),
        ...(postType ? { postType } : {}),
      },
    });

    const items = getPageContent(data);
    return { data: items, total: getPageTotal(data, items.length) };
  },

  getOne: async (_resource, params) => {
    if (isShareId(params.id)) {
      const { data } = await apiClient.get(`/api/v1/admin/post-shares/${shareUuid(params.id)}`);
      return { data };
    }
    const { data } = await apiClient.get(`/api/v1/admin/posts/${params.id}`);
    return { data };
  },

  update: async (_resource, params) => {
    // Only original posts have a moderatable status; shares are not updated here.
    const { status } = params.data;
    await apiClient.patch(`/api/v1/admin/posts/${params.id}/status`, { status });
    const { data } = await apiClient.get(`/api/v1/admin/posts/${params.id}`);
    return { data };
  },

  delete: async (_resource, params) => {
    if (isShareId(params.id)) {
      await apiClient.delete(`/api/v1/admin/post-shares/${shareUuid(params.id)}`);
    } else {
      await apiClient.delete(`/api/v1/admin/posts/${params.id}`);
    }
    return { data: { id: params.id } as any };
  },
};
