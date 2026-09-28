# QuoteLah

Turn informal customer enquiries into draft quotations for a T-shirt printing shop.

## Problem
Malaysian small business owners manually extract order details from mixed Malay/English messages, look up prices and write replies — risking missed details and pricing errors.

## Solution
One screen: paste enquiry → extract requirements → review editable fields → deterministic catalogue pricing → draft quotation and copyable reply.

## Demo workflow

1. Load the sample enquiry (or paste your own)
2. Click **Extract requirements**
3. Review and edit the extracted fields
4. See itemised quotation recalculate live
5. Switch reply language (Malay/English) and copy

### Sample enquiry
> Hi boss, nak order 30 black round-neck tees with front printing. Need by Friday. Budget bawah RM1k. Delivery to Puchong. Can?

**Expected result:** RM860 total; sizes, artwork and delivery date flagged for confirmation.

## Architecture

```
Pasted text → POST /api/extract → schema validation → editable fields
                                                          ↓
                                              deterministic pricing (lib/pricing.ts)
                                                          ↓
                                          draft quotation + templated reply
```

- `app/page.tsx` — single screen, all UI
- `app/api/extract/route.ts` — server extraction route (model call, never exposes API key)
- `lib/catalogue.ts` — prices in integer sen, delivery rules
- `lib/pricing.ts` — `calculateQuote()`, integer arithmetic only
- `lib/reply.ts` — Malay/English reply templates
- `lib/extraction.ts` — schema, server-side validator
- `lib/samples.ts` — labelled sample fixture (one pair only)

## How to run

```bash
cd quotelah
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment variables

Copy `.env.example` to `.env.local` and fill in credentials:

| Variable | Purpose |
|---|---|
| `WATSONX_API_KEY` | watsonx.ai API key |
| `WATSONX_PROJECT_ID` | watsonx.ai project ID |
| `OPENAI_API_KEY` | OpenAI API key (alternative) |

If neither is set, the app works in **Sample mode** only (labelled clearly in UI).

## How IBM Bob was used

See `BOB_USAGE.md` for a session-accurate account of Bob's contribution.

## Tests

```bash
npm test
```

See Prompt 4 for test cases and results.

## Limitations

- Catalogue is a simplified demo; prices are not real market rates. Owner must confirm all orders.
- No tax calculation modelled in this demo.
- Delivery fee only known for Puchong; other locations show "Delivery fee pending".
- Sample mode uses preset data — not live AI extraction.
- Live extraction requires separate model credentials (not provided by Bob).
- Stock, artwork, sizes and delivery date always require owner confirmation.

## Future improvements

- Add more delivery locations and fee rules
- Upload artwork files
- PDF quotation generation
- WhatsApp integration
- Real anonymised enquiry testing with shop owners
