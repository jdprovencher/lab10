import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { HttpError } from "./errors";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

interface ImageApiResponse {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  usage?: { cost?: number };
  error?: { message?: string };
}

export interface GeneratedImage {
  dataUrl: string;
  mediaType: string;
  model: string;
  elapsedMs: number;
  cost: number | null;
}

export async function generateWeatherImage(
  prompt: string,
  referencePath: string,
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      500,
      "OPENROUTER_API_KEY is not set. Add it to app/.env or the repo-level openrouter.env and restart the server.",
    );
  }

  const model = process.env.IMAGE_MODEL ?? "qwen/qwen-image-2.1-turbo";
  const mime = MIME_BY_EXTENSION[extname(referencePath).toLowerCase()];
  if (!mime) {
    throw new HttpError(
      500,
      `Unsupported reference image type: ${referencePath}`,
    );
  }

  const referenceBytes = await readFile(referencePath);
  const referenceUrl = `data:${mime};base64,${referenceBytes.toString("base64")}`;
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.OPENROUTER_SITE_URL ?? "http://localhost:5173",
        "X-Title": "CS2010 Weather Mood",
      },
      body: JSON.stringify({
        model,
        prompt,
        input_references: [
          { type: "image_url", image_url: { url: referenceUrl } },
        ],
        n: 1,
        aspect_ratio: "16:9",
        resolution: "2K",
      }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (error) {
    console.error("OpenRouter request failed:", error);
    throw new HttpError(
      502,
      "Could not reach OpenRouter. Check your network connection and try again.",
    );
  }

  const bodyText = await response.text();
  let body: ImageApiResponse;
  try {
    body = JSON.parse(bodyText) as ImageApiResponse;
  } catch {
    throw new HttpError(
      502,
      `OpenRouter returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const message =
      body.error?.message ?? `OpenRouter request failed (HTTP ${response.status}).`;
    if (response.status === 401) {
      throw new HttpError(401, `OpenRouter rejected the API key: ${message}`);
    }
    if (response.status === 402) {
      throw new HttpError(402, `OpenRouter has insufficient credits: ${message}`);
    }
    if (response.status === 429) {
      throw new HttpError(
        429,
        "OpenRouter rate limit reached. Wait a moment and try again.",
      );
    }
    throw new HttpError(502, `Image generation failed: ${message}`);
  }

  const image = body.data?.[0];
  if (!image?.b64_json) {
    throw new HttpError(502, "OpenRouter returned no image data.");
  }

  const mediaType = image.media_type ?? "image/png";
  return {
    dataUrl: `data:${mediaType};base64,${image.b64_json}`,
    mediaType,
    model,
    elapsedMs: Date.now() - started,
    cost: body.usage?.cost ?? null,
  };
}
