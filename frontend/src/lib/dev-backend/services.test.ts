import { beforeEach, describe, expect, it } from "vitest";

import {
  createService,
  deleteService,
  findCategoryById,
  findService,
  listCategories,
  listServices,
  resetDevBackend,
  updateService,
} from "@/lib/dev-backend/store";

const ORG = "00000000-0000-4000-8000-000000000011";
const CUSTOM_DEVELOPMENT = "00000000-0000-4000-8000-000000000053";
const CLOUD = "00000000-0000-4000-8000-000000000052";

/**
 * Sprint 4 service management (docs/09_Sprint_Plan.md:284-306).
 *
 * These pin the dev BFF to the Django slice: the same seeded category
 * vocabulary, the same filters, and the same decoration of each row with its
 * parent organization and category name. Without that parity, the frontend is
 * only ever exercised against a contract the real API does not implement.
 */
describe("service catalogue", () => {
  beforeEach(() => {
    resetDevBackend();
  });

  it("seeds the same category vocabulary as the Django migration", () => {
    const names = listCategories().map((category) => category.name);

    expect(names).toHaveLength(8);
    expect(names).toEqual([
      "Cloud & Infrastructure",
      "Consulting",
      "Custom Development",
      "Data & AI",
      "Design & Brand",
      "Marketing & Growth",
      "Support & Maintenance",
      "Training",
    ]);
    expect(findCategoryById(CUSTOM_DEVELOPMENT)?.name).toBe("Custom Development");
  });

  it("decorates each service with its organization and category", () => {
    const [service] = listServices(ORG);

    expect(service.organization_name).toBe("Addis Software Works");
    expect(service.category_name).toBeTruthy();
    expect(service.organization_rating).toBeTypeOf("number");
  });

  it("filters by category and by search term", () => {
    const customDevelopment = listServices(ORG, { category_id: CUSTOM_DEVELOPMENT });
    expect(customDevelopment).toHaveLength(2);
    expect(customDevelopment.every((service) => service.category_name === "Custom Development")).toBe(
      true,
    );

    const cloud = listServices(ORG, { category_id: CLOUD });
    expect(cloud.map((service) => service.name)).toEqual([
      "Legacy System Modernisation",
    ]);

    const search = listServices(ORG, { search: "mobile" });
    expect(search.map((service) => service.name)).toEqual(["Mobile App Development"]);
  });

  it("creates a service in a category and lets the owner edit it", () => {
    const created = createService({
      organization_id: ORG,
      name: "API Integration",
      description: "Connect third-party systems.",
      price: 12000,
      category_id: CUSTOM_DEVELOPMENT,
    });

    expect(created.status).toBe(true);
    expect(created.category_name).toBe("Custom Development");
    expect(findService(created.id)?.name).toBe("API Integration");

    const updated = updateService(created.id, {
      status: false,
      category_id: CLOUD,
    });

    expect(updated?.status).toBe(false);
    expect(updated?.category_name).toBe("Cloud & Infrastructure");
  });

  it("clears a category when the update explicitly sends null", () => {
    const created = createService({
      organization_id: ORG,
      name: "Uncategorised",
      category_id: CUSTOM_DEVELOPMENT,
    });

    const updated = updateService(created.id, { category_id: null });

    expect(updated?.category_id).toBeNull();
    expect(updated?.category_name).toBeNull();
  });

  it("removes only the service, not the category it used", () => {
    const created = createService({
      organization_id: ORG,
      name: "Temporary",
      category_id: CUSTOM_DEVELOPMENT,
    });

    expect(deleteService(created.id)).toBe(true);
    expect(findService(created.id)).toBeUndefined();
    expect(findCategoryById(CUSTOM_DEVELOPMENT)?.name).toBe("Custom Development");
  });
});
