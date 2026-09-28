// All monetary values in integer sen (1 RM = 100 sen)
// Simplified demo prices — not market claims. Owner must confirm stock.

export interface CatalogueItem {
  id: string;
  name: string;
  unitPriceSen: number;
  description: string;
}

export interface DeliveryOption {
  location: string | null; // null = any matched location
  feeSen: number;
  label: string;
}

export const CATALOGUE: CatalogueItem[] = [
  {
    id: "ROUND_NECK_TEE",
    name: "Round-Neck T-Shirt",
    unitPriceSen: 2000,
    description: "RM20 per unit",
  },
  {
    id: "POLO_TEE",
    name: "Polo T-Shirt",
    unitPriceSen: 3500,
    description: "RM35 per unit",
  },
];

export const PRINT_OPTIONS = {
  FRONT_PRINT: {
    id: "FRONT_PRINT",
    name: "Front Printing",
    perUnitSen: 800,
    description: "RM8 per shirt",
  },
} as const;

export const DELIVERY_RULES: DeliveryOption[] = [
  { location: "puchong", feeSen: 2000, label: "Delivery to Puchong: RM20" },
];

export const SELF_COLLECTION_FEE_SEN = 0;

export function getCatalogueItem(id: string): CatalogueItem | undefined {
  return CATALOGUE.find((item) => item.id === id);
}

export function getDeliveryFee(
  method: "delivery" | "collection" | "unknown",
  location: string | null
): { feeSen: number | null; label: string } {
  if (method === "collection") {
    return { feeSen: SELF_COLLECTION_FEE_SEN, label: "Self-collection: Free" };
  }
  if (method === "unknown") {
    return { feeSen: null, label: "Delivery fee pending" };
  }
  // method === "delivery"
  if (!location) {
    return { feeSen: null, label: "Delivery fee pending" };
  }
  const normalised = location.toLowerCase().trim();
  const rule = DELIVERY_RULES.find(
    (r) => r.location && normalised.includes(r.location)
  );
  if (rule) {
    return { feeSen: rule.feeSen, label: rule.label };
  }
  return { feeSen: null, label: "Delivery fee pending (location not in list)" };
}
