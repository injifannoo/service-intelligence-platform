/**
 * Public API surface for the services slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { MutationError, ServiceCard } from "./components/service-card";
export { ServiceCatalogFilters } from "./components/service-catalog-filters";
export { InlineSpinner, ServiceList } from "./components/service-list";
export { ServiceForm } from "./components/service-form";
export { ServicesWorkspace } from "./components/services-workspace";

export { categoriesApi } from "./api/get-categories";
export { servicesApi } from "./api/get-services";
export type { ServiceWithOrganization } from "./api/get-services";
export {
  serviceKeys,
  useCategories,
  useCreateService,
  useDeleteService,
  useService,
  useServices,
  useUpdateService,
} from "./api/use-service";

export type { Category, Service, ServiceFilters, ServiceInput } from "./types";
