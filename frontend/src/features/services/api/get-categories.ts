import { apiPaginated } from "@/lib/api-client";
import type { Category } from "@/types";

/**
 * Transport for `GET /api/v1/categories/` (Sprint 4, docs/09:284-306).
 *
 * Categories are a small, shared vocabulary, so the slice requests the maximum
 * page size once and renders the whole set in a select.
 */
export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data } = await apiPaginated<Category>("/categories/", {
      query: { page_size: 100 },
    });
    return data;
  },
};
