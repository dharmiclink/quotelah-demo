export interface RequirementsSchema {
  productId: string | null;
  requestedProductText: string | null;
  quantity: number | null;
  colour: string | null;
  frontPrinting: boolean | null;
  deliveryMethod: "delivery" | "collection" | "unknown";
  location: string | null;
  deadlineText: string | null;
  budgetSen: number | null;
  budgetComparison: "under" | "atMost" | "unknown";
  sizes: string[] | null;
  artworkProvided: boolean | null;
  missingFields: string[];
  sourceExcerpts: string[];
}

const ALLOWED_PRODUCT_IDS = ["ROUND_NECK_TEE", "POLO_TEE", null];
const ALLOWED_DELIVERY_METHODS = ["delivery", "collection", "unknown"];
const ALLOWED_BUDGET_COMPARISONS = ["under", "atMost", "unknown"];

export function validateRequirements(raw: unknown): RequirementsSchema {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Extraction result is not an object");
  }
  const r = raw as Record<string, unknown>;

  // productId
  if (!ALLOWED_PRODUCT_IDS.includes(r.productId as string | null)) {
    throw new Error(`Invalid productId: ${r.productId}`);
  }

  // quantity: must be positive integer or null
  if (r.quantity !== null && r.quantity !== undefined) {
    if (
      typeof r.quantity !== "number" ||
      !Number.isInteger(r.quantity) ||
      r.quantity <= 0
    ) {
      throw new Error(`Invalid quantity: ${r.quantity}`);
    }
  }

  // deliveryMethod
  if (!ALLOWED_DELIVERY_METHODS.includes(r.deliveryMethod as string)) {
    throw new Error(`Invalid deliveryMethod: ${r.deliveryMethod}`);
  }

  // budgetComparison
  if (!ALLOWED_BUDGET_COMPARISONS.includes(r.budgetComparison as string)) {
    throw new Error(`Invalid budgetComparison: ${r.budgetComparison}`);
  }

  // budgetSen: must be positive integer or null
  if (r.budgetSen !== null && r.budgetSen !== undefined) {
    if (
      typeof r.budgetSen !== "number" ||
      !Number.isInteger(r.budgetSen) ||
      r.budgetSen <= 0
    ) {
      throw new Error(`Invalid budgetSen: ${r.budgetSen}`);
    }
  }

  // frontPrinting: true/false/null
  if (
    r.frontPrinting !== null &&
    r.frontPrinting !== undefined &&
    typeof r.frontPrinting !== "boolean"
  ) {
    throw new Error(`Invalid frontPrinting: ${r.frontPrinting}`);
  }

  return {
    productId: (r.productId as string | null) ?? null,
    requestedProductText: (r.requestedProductText as string | null) ?? null,
    quantity: (r.quantity as number | null) ?? null,
    colour: (r.colour as string | null) ?? null,
    frontPrinting: (r.frontPrinting as boolean | null) ?? null,
    deliveryMethod: (r.deliveryMethod as "delivery" | "collection" | "unknown") ?? "unknown",
    location: (r.location as string | null) ?? null,
    deadlineText: (r.deadlineText as string | null) ?? null,
    budgetSen: (r.budgetSen as number | null) ?? null,
    budgetComparison: (r.budgetComparison as "under" | "atMost" | "unknown") ?? "unknown",
    sizes: Array.isArray(r.sizes) ? (r.sizes as string[]) : null,
    artworkProvided: (r.artworkProvided as boolean | null) ?? null,
    missingFields: Array.isArray(r.missingFields) ? (r.missingFields as string[]) : [],
    sourceExcerpts: Array.isArray(r.sourceExcerpts) ? (r.sourceExcerpts as string[]) : [],
  };
}
