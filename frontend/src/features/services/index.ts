/**
 * Public API surface for the services slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { MutationError, ServiceCard } from "./components/service-card";
export { InlineSpinner, ServiceList } from "./components/service-list";
export { ServiceForm } from "./components/service-form";

export { servicesApi } from "./api/get-services";
export type { ServiceWithOrganization } from "./api/get-services";
export {
  serviceKeys,
  useCreateService,
  useDeleteService,
  useService,
  useServices,
} from "./api/use-service";

export type { Service, ServiceInput } from "./types";
