/**
 * festora-vision-api client
 *
 * This module is the ONLY place in Festora that knows the vision API URL.
 * All response types match the API's OpenAPI schema exactly.
 * No Festora-specific logic lives here — mapping to Prisma models happens
 * in the caller (photo-actions.ts, analysis-actions.ts).
 *
 * Usage:
 *   import { VisionClient } from "@/lib/vision/vision-client"
 *   const client = VisionClient.fromEnv()
 *   const result = await client.analyzePhoto({ url: presignedUrl })
 */

// ------------------------------------------------------------------ //
// Response types — mirroring the Python Pydantic schemas exactly
// ------------------------------------------------------------------ //

export interface BlurResult {
  laplacian_variance: number;
  is_blurry: boolean;
  blur_threshold: number;
}

export interface QualityResult {
  brisque_score: number;
  nima_technical_score: number;
  overall_quality: "low" | "medium" | "high";
}

export interface AestheticResult {
  nima_aesthetic_score: number;
  aesthetic_label: "low" | "medium" | "high";
}

export interface EmotionEntry {
  dominant_emotion: string;
  scores: Record<string, number>;
  face_confidence: number;
  region: { x: number; y: number; w: number; h: number };
}

export interface EmotionResult {
  faces_detected: number;
  faces: EmotionEntry[];
}

export interface EmbeddingResult {
  model: string;
  dimensions: number;
  vector: number[];
}

export interface ImageAnalysisResult {
  image_id: string | null;
  source_url: string | null;
  width_px: number | null;
  height_px: number | null;
  blur: BlurResult | null;
  quality: QualityResult | null;
  aesthetic: AestheticResult | null;
  emotion: EmotionResult | null;
  embedding: EmbeddingResult | null;
  processing_time_ms: number;
  error: string | null;
}

export interface AnalyzeResponse {
  api_version: string;
  result: ImageAnalysisResult;
}

export interface BatchAnalyzeResponse {
  api_version: string;
  total: number;
  succeeded: number;
  failed: number;
  results: ImageAnalysisResult[];
  total_processing_time_ms: number;
}

export interface ClusterAssignment {
  image_id: string;
  cluster_id: number;
  is_noise: boolean;
}

export interface ClusterSummary {
  cluster_id: number;
  size: number;
  image_ids: string[];
}

export interface ClusterResponse {
  api_version: string;
  algorithm: string;
  eps_used: number;
  min_samples_used: number;
  total_images: number;
  num_clusters: number;
  num_noise: number;
  assignments: ClusterAssignment[];
  clusters: ClusterSummary[];
  processing_time_ms: number;
}

// ------------------------------------------------------------------ //
// Request option types
// ------------------------------------------------------------------ //

export interface AnalysisFlags {
  run_blur?: boolean;
  run_quality?: boolean;
  run_emotion?: boolean;
  run_embedding?: boolean;
}

export interface AnalyzePhotoOptions extends AnalysisFlags {
  /** Public or presigned URL to the image. */
  url: string;
  /** Optional correlation ID echoed back in the response. */
  imageId?: string;
}

export interface BatchAnalyzeOptions extends AnalysisFlags {
  images: Array<{ url: string; imageId?: string }>;
}

export interface ClusterOptions {
  embeddings: number[][];
  imageIds: string[];
  eps?: number;
  minSamples?: number;
}

// ------------------------------------------------------------------ //
// Error class
// ------------------------------------------------------------------ //

export class VisionApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "VisionApiError";
  }
}

// ------------------------------------------------------------------ //
// Client
// ------------------------------------------------------------------ //

export class VisionClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: {
    baseUrl: string;
    apiKey?: string;
    timeoutMs?: number;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey ?? "";
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Construct a VisionClient from environment variables.
   *   VISION_API_URL      — required (e.g. http://localhost:8000)
   *   VISION_API_KEY      — optional; omit for open-mode dev
   *   VISION_API_TIMEOUT  — optional, milliseconds (default 30000)
   */
  static fromEnv(): VisionClient {
    const baseUrl = process.env.VISION_API_URL;
    if (!baseUrl) {
      throw new Error(
        "VISION_API_URL environment variable is not set. " +
          "Point it at your festora-vision-api instance."
      );
    }
    return new VisionClient({
      baseUrl,
      apiKey: process.env.VISION_API_KEY ?? "",
      timeoutMs: process.env.VISION_API_TIMEOUT
        ? parseInt(process.env.VISION_API_TIMEOUT, 10)
        : 30_000,
    });
  }

  // ---------------------------------------------------------------- //
  // Public API methods
  // ---------------------------------------------------------------- //

  async analyzePhoto(options: AnalyzePhotoOptions): Promise<AnalyzeResponse> {
    return this.post<AnalyzeResponse>("/v1/analyze", {
      image: { url: options.url, image_id: options.imageId ?? null },
      run_blur: options.run_blur ?? true,
      run_quality: options.run_quality ?? true,
      run_emotion: options.run_emotion ?? true,
      run_embedding: options.run_embedding ?? true,
    });
  }

  async analyzePhotoBatch(
    options: BatchAnalyzeOptions
  ): Promise<BatchAnalyzeResponse> {
    return this.post<BatchAnalyzeResponse>("/v1/analyze/batch", {
      images: options.images.map((img) => ({
        url: img.url,
        image_id: img.imageId ?? null,
      })),
      run_blur: options.run_blur ?? true,
      run_quality: options.run_quality ?? true,
      run_emotion: options.run_emotion ?? false,
      run_embedding: options.run_embedding ?? true,
    });
  }

  async clusterEmbeddings(
    options: ClusterOptions
  ): Promise<ClusterResponse> {
    return this.post<ClusterResponse>("/v1/cluster", {
      embeddings: options.embeddings,
      image_ids: options.imageIds,
      eps: options.eps ?? 0.35,
      min_samples: options.minSamples ?? 2,
    });
  }

  async health(): Promise<{ status: string; version: string }> {
    return this.get("/health");
  }

  // ---------------------------------------------------------------- //
  // Private HTTP helpers
  // ---------------------------------------------------------------- //

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }
    return headers;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        throw new VisionApiError(
          "timeout",
          `Vision API request to ${path} timed out after ${this.timeoutMs}ms.`,
          408
        );
      }
      throw new VisionApiError(
        "network_error",
        `Could not reach Vision API at ${url}: ${(err as Error).message}`,
        503
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let errorBody: { error?: string; message?: string } = {};
      try {
        errorBody = await response.json();
      } catch {}
      throw new VisionApiError(
        errorBody.error ?? "api_error",
        errorBody.message ?? `Vision API returned HTTP ${response.status}`,
        response.status
      );
    }

    return response.json() as Promise<T>;
  }

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, { headers: this.buildHeaders() });
    if (!response.ok) {
      throw new VisionApiError(
        "api_error",
        `Vision API GET ${path} returned HTTP ${response.status}`,
        response.status
      );
    }
    return response.json() as Promise<T>;
  }
}
