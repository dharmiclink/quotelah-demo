import type { RequirementsSchema } from "./extraction";
import type { QuoteResult } from "./pricing";
import { formatSen } from "./pricing";

function missingFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    sizes: "sizes",
    artworkProvided: "artwork confirmation",
    deadlineText: "confirmed delivery date",
    frontPrinting: "printing choice",
    quantity: "quantity",
    productId: "product",
    location: "delivery location",
  };
  return labels[field] ?? field;
}

export function buildMalayReply(
  req: RequirementsSchema,
  quote: QuoteResult
): string {
  const product = req.requestedProductText ?? "produk";
  const qty = req.quantity ?? "?";

  let priceSection = "";
  if (quote.totalSen !== null) {
    priceSection = `Harga anggaran untuk ${qty} unit ${product}:\n`;
    for (const line of quote.lineItems) {
      priceSection += `  - ${line.label}: ${formatSen(line.totalSen)}\n`;
    }
    priceSection += `  - ${quote.deliveryLabel}\n`;
    priceSection += `  Jumlah: ${formatSen(quote.totalSen)}\n`;
  } else if (quote.subtotalSen !== null) {
    priceSection = `Subtotal (tanpa penghantaran): ${formatSen(quote.subtotalSen)}\n`;
    priceSection += `  - ${quote.deliveryLabel}\n`;
  } else {
    priceSection = `Sebut harga belum dapat dikira — sila sahkan maklumat di bawah.\n`;
  }

  let pendingSection = "";
  if (quote.missingFields.length > 0) {
    pendingSection = `\nMaklumat yang perlu disahkan:\n`;
    for (const f of quote.missingFields) {
      pendingSection += `  - ${missingFieldLabel(f)}\n`;
    }
  }

  return `Terima kasih kerana menghubungi kami!

${priceSection}
⚠️ Ini adalah sebut harga draf — pemilik perlu mengesahkan stok, saiz, rekaan dan tarikh penghantaran sebelum pesanan disahkan.
${pendingSection}
Sila hubungi kami semula selepas mengesahkan butiran di atas. Terima kasih!`;
}

export function buildEnglishReply(
  req: RequirementsSchema,
  quote: QuoteResult
): string {
  const product = req.requestedProductText ?? "item";
  const qty = req.quantity ?? "?";

  let priceSection = "";
  if (quote.totalSen !== null) {
    priceSection = `Estimated price for ${qty} × ${product}:\n`;
    for (const line of quote.lineItems) {
      priceSection += `  - ${line.label}: ${formatSen(line.totalSen)}\n`;
    }
    priceSection += `  - ${quote.deliveryLabel}\n`;
    priceSection += `  Total: ${formatSen(quote.totalSen)}\n`;
  } else if (quote.subtotalSen !== null) {
    priceSection = `Subtotal (excluding delivery): ${formatSen(quote.subtotalSen)}\n`;
    priceSection += `  - ${quote.deliveryLabel}\n`;
  } else {
    priceSection = `Quote could not be calculated — please confirm the details below.\n`;
  }

  let pendingSection = "";
  if (quote.missingFields.length > 0) {
    pendingSection = `\nItems still needed:\n`;
    for (const f of quote.missingFields) {
      pendingSection += `  - ${missingFieldLabel(f)}\n`;
    }
  }

  return `Hi, thank you for your enquiry!

${priceSection}
⚠️ This is a draft quotation — the owner must confirm stock, sizes, artwork and delivery date before the order is confirmed.
${pendingSection}
Please get back to us once the above details are confirmed. Thank you!`;
}
