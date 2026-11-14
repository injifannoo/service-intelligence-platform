import { queryOptions } from "@tanstack/react-query";
import { orgQuery, toView } from "@/lib/api";
import { apiClient, ApiError, usesRestBackend } from "@/lib/api-client";
import { fromRestOrganization, type RestOrganization } from "./rest-organization";

export const getOrganization = (slug: string) => usesRestBackend()
  ? queryOptions({
      queryKey: ["org", slug, "rest"],
      queryFn: async () => {
        try {
          const row = await apiClient<RestOrganization>(`/organizations/${encodeURIComponent(slug)}/`, {}, { authenticated: false });
          return toView(fromRestOrganization(row));
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }
      },
    })
  : orgQuery(slug);