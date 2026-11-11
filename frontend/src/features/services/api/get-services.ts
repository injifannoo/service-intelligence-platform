import { queryOptions } from "@tanstack/react-query";
import { servicesQuery } from "@/lib/api";
import { apiListClient, usesRestBackend } from "@/lib/api-client";
import type { Service } from "../types";

type RestService = Omit<Service, "org_id" | "price_from"> & { organization: string; price_from: string | number | null };

export const getServices = (orgId: string) => usesRestBackend()
  ? queryOptions({
      queryKey: ["services", orgId, "rest"],
      queryFn: async (): Promise<Service[]> => (await apiListClient<RestService>(`/services/?organization=${encodeURIComponent(orgId)}`))
        .map(({ organization, price_from, ...row }) => ({ ...row, org_id: organization, price_from: price_from === null ? null : Number(price_from) })),
    })
  : servicesQuery(orgId);
