import { NextRequest, NextResponse } from "next/server";
import { validateRequirements } from "@/lib/extraction";
import { buildSystemPrompt, buildUserMessage } from "@/lib/extractionPrompt";

const MAX_CHARS = 5000;
const TIMEOUT_MS = 15000;

export async function POST(req: NextRequest) {
  let body: { message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = body.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Field 'message' must be a non-empty string." },
      { status: 400 }
    );
  }
  if (message.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Message too long. Maximum ${MAX_CHARS} characters.` },
      { status: 400 }
    );
  }

  // Determine which provider to use
  const watsonxKey = process.env.WATSONX_API_KEY;
  const watsonxProject = process.env.WATSONX_PROJECT_ID;
  const openaiKey = process.env.OPENAI_API_KEY;

  const hasWatsonx = !!(watsonxKey && watsonxProject);
  const hasOpenAI = !!openaiKey;

  if (!hasWatsonx && !hasOpenAI) {
    return NextResponse.json(
      {
        error: "MODEL_NOT_CONFIGURED",
        message:
          "No model credentials configured. Set WATSONX_API_KEY + WATSONX_PROJECT_ID or OPENAI_API_KEY in your .env.local file. Use Sample mode or enter fields manually.",
        requiredVars: [
          "WATSONX_API_KEY (and WATSONX_PROJECT_ID)",
          "or OPENAI_API_KEY",
        ],
      },
      { status: 503 }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let rawText: string;

    if (hasWatsonx) {
      rawText = await extractWithWatsonx(
        message,
        watsonxKey!,
        watsonxProject!,
        controller.signal
      );
    } else {
      rawText = await extractWithOpenAI(message, openaiKey!, controller.signal);
    }

    clearTimeout(timer);

    // Parse JSON from model output
    let parsed: unknown;
    try {
      // Strip any accidental markdown fences the model may add
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[extract] JSON parse error. Raw:", rawText.slice(0, 300));
      return NextResponse.json(
        {
          error:
            "Model returned invalid JSON. Try again or use Sample mode.",
        },
        { status: 500 }
      );
    }

    // Server-side schema validation — model cannot set prices
    const validated = validateRequirements(parsed);
    return NextResponse.json({ requirements: validated });
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Model request timed out. Please retry." },
        { status: 504 }
      );
    }

    const msg = err instanceof Error ? err.message : "Unknown extraction error.";
    // Never log or expose API keys
    console.error("[extract] error:", msg.replace(/sk-[^\s]+/g, "***").replace(/Bearer [^\s]+/g, "Bearer ***"));
    return NextResponse.json(
      { error: `Extraction failed: ${msg}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// watsonx.ai adapter — REST API, no SDK required
// ---------------------------------------------------------------------------
async function extractWithWatsonx(
  customerMessage: string,
  apiKey: string,
  projectId: string,
  signal: AbortSignal
): Promise<string> {
  // Get IAM token
  const iamRes = await fetch(
    "https://iam.cloud.ibm.com/identity/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
      signal,
    }
  );

  if (!iamRes.ok) {
    throw new Error(
      `watsonx IAM token request failed: ${iamRes.status} ${iamRes.statusText}`
    );
  }

  const iamData = await iamRes.json();
  const accessToken: string = iamData.access_token;
  if (!accessToken) {
    throw new Error("watsonx IAM response did not include access_token.");
  }

  // watsonx.ai text generation endpoint
  const region = process.env.WATSONX_REGION ?? "us-south";
  const modelId =
    process.env.WATSONX_MODEL_ID ?? "ibm/granite-3-3-8b-instruct";

  const payload = {
    model_id: modelId,
    project_id: projectId,
    input: `<|system|>\n${buildSystemPrompt()}\n<|user|>\n${buildUserMessage(customerMessage)}\n<|assistant|>\n`,
    parameters: {
      decoding_method: "greedy",
      max_new_tokens: 800,
      stop_sequences: ["<|user|>", "<|system|>"],
      repetition_penalty: 1.05,
    },
  };

  const wxRes = await fetch(
    `https://${region}.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      signal,
    }
  );

  if (!wxRes.ok) {
    const errBody = await wxRes.text().catch(() => "");
    throw new Error(
      `watsonx generation failed: ${wxRes.status} ${wxRes.statusText}. ${errBody.slice(0, 200)}`
    );
  }

  const wxData = await wxRes.json();
  const generated: string =
    wxData?.results?.[0]?.generated_text ?? "";
  if (!generated) {
    throw new Error("watsonx returned empty generated_text.");
  }
  return generated.trim();
}

// ---------------------------------------------------------------------------
// OpenAI adapter
// ---------------------------------------------------------------------------
async function extractWithOpenAI(
  customerMessage: string,
  apiKey: string,
  signal: AbortSignal
): Promise<string> {
  const { default: OpenAI } = await import("openai");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserMessage(customerMessage) },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: "json_object" },
    },
    { signal }
  );

  const content = completion.choices[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("OpenAI returned empty content.");
  }
  return content.trim();
}
