import { queryOptions } from "@tanstack/react-query";
import { orgsQuery, toView } from "@/lib/api";
import { apiListClient, usesRestBackend } from "@/lib/api-client";
import { fromRestOrganization, type RestOrganization } from "./rest-organization";

/** Organizations list: Lovable Cloud by default, Django /api/v1/organizations/ when VITE_API_BASE_URL is set. */
export const getOrganizations = () =>
  usesRestBackend()
    ? queryOptions({
        queryKey: ["orgs", "rest"],
        queryFn: async () => (await apiListClient<RestOrganization>("/organizations/")).map(fromRestOrganization).map(toView),
      })
    : orgsQuery();
