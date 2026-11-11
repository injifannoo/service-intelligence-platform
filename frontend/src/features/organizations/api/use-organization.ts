import { useQuery } from "@tanstack/react-query";
import { getOrganization } from "./get-organization";
export const useOrganization = (slug: string) => useQuery(getOrganization(slug));
