import type { RequirementsSchema } from "./extraction";

// The one canonical sample enquiry.
// ONLY this exact text (trimmed) may use the stored fixture extraction.
export const SAMPLE_ENQUIRY_TEXT = `Hi boss, nak order 30 black round-neck tees with front printing. Need by Friday. Budget bawah RM1k. Delivery to Puchong. Can?`;

// Pre-extracted requirements for the sample above.
// "Bawah RM1k" = strictly under 100 000 sen.
export const SAMPLE_EXTRACTION: RequirementsSchema = {
  productId: "ROUND_NECK_TEE",
  requestedProductText: "black round-neck tees",
  quantity: 30,
  colour: "black",
  frontPrinting: true,
  deliveryMethod: "delivery",
  location: "Puchong",
  deadlineText: "Friday",
  budgetSen: 100000,
  budgetComparison: "under",
  sizes: null,            // not specified — must be flagged
  artworkProvided: null,  // not confirmed — must be flagged
  missingFields: ["sizes", "artworkProvided"],
  sourceExcerpts: [
    "nak order 30 black round-neck tees",
    "with front printing",
    "Need by Friday",
    "Budget bawah RM1k",
    "Delivery to Puchong",
  ],
};

/**
 * Returns true only when the pasted message exactly matches the canonical
 * sample text (whitespace-trimmed). Never reuse the fixture for any other input.
 */
export function isSampleText(text: string): boolean {
  return text.trim() === SAMPLE_ENQUIRY_TEXT.trim();
}
