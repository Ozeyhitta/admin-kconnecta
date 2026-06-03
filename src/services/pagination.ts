type PageLikeResponse<T = any> = {
  content?: T[];
  items?: T[];
  total?: number;
  totalElements?: number;
  pagination?: {
    totalElements?: number;
    totalPages?: number;
  };
  page?: {
    totalElements?: number;
    totalPages?: number;
    size?: number;
  };
};

export const getPageContent = <T = any>(data: PageLikeResponse<T>): T[] =>
  data.content ?? data.items ?? [];

export const getPageTotal = <T>(
  data: PageLikeResponse<T>,
  fallback = 0,
): number =>
  data.totalElements ??
  data.pagination?.totalElements ??
  data.page?.totalElements ??
  data.total ??
  (data.page?.totalPages != null && data.page?.size != null
    ? data.page.totalPages * data.page.size
    : fallback);

export const getPageTotalPages = <T = any>(
  data: PageLikeResponse<T>,
  perPage: number,
  fallback = 1,
): number =>
  data.pagination?.totalPages ??
  data.page?.totalPages ??
  (data.totalElements != null ||
  data.pagination?.totalElements != null ||
  data.page?.totalElements != null ||
  data.total != null
    ? Math.max(1, Math.ceil(getPageTotal(data) / perPage))
    : fallback);
