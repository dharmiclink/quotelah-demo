import {
  getCatalogueItem,
  getDeliveryFee,
  PRINT_OPTIONS,
} from "./catalogue";
import type { RequirementsSchema } from "./extraction";

export interface LineItem {
  label: string;
  unitSen: number;
  quantity: number;
  totalSen: number;
}

export type BudgetStatus =
  | "within"
  | "over"
  | "pending"
  | "unknown";

export interface QuoteResult {
  lineItems: LineItem[];
  subtotalSen: number | null;
  deliveryLabel: string;
  deliverySen: number | null;
  totalSen: number | null;
  budgetStatus: BudgetStatus;
  missingFields: string[];
  warnings: string[];
  isComplete: boolean;
}

export function formatSen(sen: number): string {
  return `RM${(sen / 100).toFixed(2)}`;
}

export function calculateQuote(req: RequirementsSchema): QuoteResult {
  const missingFields: string[] = [...(req.missingFields ?? [])];
  const warnings: string[] = [];

  // --- Validate quantity ---
  if (
    req.quantity === null ||
    req.quantity === undefined ||
    req.quantity <= 0 ||
    !Number.isInteger(req.quantity)
  ) {
    missingFields.push("quantity");
    return {
      lineItems: [],
      subtotalSen: null,
      deliveryLabel: "Delivery fee pending",
      deliverySen: null,
      totalSen: null,
      budgetStatus: "pending",
      missingFields: [...new Set(missingFields)],
      warnings: ["Valid positive integer quantity is required before pricing."],
      isComplete: false,
    };
  }

  // --- Validate product ---
  if (!req.productId) {
    return {
      lineItems: [],
      subtotalSen: null,
      deliveryLabel: "Delivery fee pending",
      deliverySen: null,
      totalSen: null,
      budgetStatus: "pending",
      missingFields: [...new Set(missingFields)],
      warnings: [
        `"${req.requestedProductText ?? "Unknown product"}" is not in the catalogue. Manual review required.`,
      ],
      isComplete: false,
    };
  }

  const product = getCatalogueItem(req.productId);
  if (!product) {
    return {
      lineItems: [],
      subtotalSen: null,
      deliveryLabel: "Delivery fee pending",
      deliverySen: null,
      totalSen: null,
      budgetStatus: "pending",
      missingFields: [...new Set(missingFields)],
      warnings: ["Product not found in catalogue. Manual review required."],
      isComplete: false,
    };
  }

  // --- Validate printing ---
  if (req.frontPrinting === null || req.frontPrinting === undefined) {
    return {
      lineItems: [],
      subtotalSen: null,
      deliveryLabel: "Delivery fee pending",
      deliverySen: null,
      totalSen: null,
      budgetStatus: "pending",
      missingFields: [...new Set([...missingFields, "frontPrinting"])],
      warnings: ["Please clarify whether front printing is required before calculating total."],
      isComplete: false,
    };
  }

  const lineItems: LineItem[] = [];

  // Product line
  const productTotal = product.unitPriceSen * req.quantity;
  lineItems.push({
    label: `${product.name} × ${req.quantity}`,
    unitSen: product.unitPriceSen,
    quantity: req.quantity,
    totalSen: productTotal,
  });

  // Print line
  if (req.frontPrinting === true) {
    const printTotal = PRINT_OPTIONS.FRONT_PRINT.perUnitSen * req.quantity;
    lineItems.push({
      label: `Front Printing × ${req.quantity}`,
      unitSen: PRINT_OPTIONS.FRONT_PRINT.perUnitSen,
      quantity: req.quantity,
      totalSen: printTotal,
    });
  }

  const subtotalSen = lineItems.reduce((sum, l) => sum + l.totalSen, 0);

  // Delivery
  const delivery = getDeliveryFee(
    req.deliveryMethod ?? "unknown",
    req.location ?? null
  );

  const totalSen =
    delivery.feeSen !== null ? subtotalSen + delivery.feeSen : null;

  // Warnings for non-blocking missing info
  if (!req.sizes || req.sizes.length === 0) {
    warnings.push("Sizes not confirmed — draft only. Owner must verify.");
    if (!missingFields.includes("sizes")) missingFields.push("sizes");
  }
  if (req.artworkProvided === null || req.artworkProvided === undefined) {
    warnings.push("Artwork not confirmed — draft only.");
    if (!missingFields.includes("artworkProvided"))
      missingFields.push("artworkProvided");
  }
  if (!req.deadlineText || req.deadlineText.toLowerCase() === "unknown") {
    warnings.push("Delivery date not confirmed — never promise availability.");
    if (!missingFields.includes("deadlineText"))
      missingFields.push("deadlineText");
  } else if (req.deadlineText) {
    warnings.push(
      `Deadline "${req.deadlineText}" is approximate — confirm exact date with customer.`
    );
  }

  // Budget check
  let budgetStatus: BudgetStatus = "unknown";
  if (totalSen !== null && req.budgetSen !== null && req.budgetSen !== undefined) {
    if (req.budgetComparison === "under") {
      budgetStatus = totalSen < req.budgetSen ? "within" : "over";
    } else if (req.budgetComparison === "atMost") {
      budgetStatus = totalSen <= req.budgetSen ? "within" : "over";
    } else {
      budgetStatus = "unknown";
    }
  } else if (totalSen === null) {
    budgetStatus = "pending";
  }

  return {
    lineItems,
    subtotalSen,
    deliveryLabel: delivery.label,
    deliverySen: delivery.feeSen,
    totalSen,
    budgetStatus,
    missingFields: [...new Set(missingFields)],
    warnings,
    isComplete: totalSen !== null && missingFields.length === 0,
  };
}
