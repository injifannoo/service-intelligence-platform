export interface ProviderInput {
  id: string;
  name: string;
  description: string;
  location: string;
  services: string[];
  rating: number;
  price_level: string;
}

export interface RecommendationRequest {
  requirement: string;
  providers: ProviderInput[];
}

export interface RecommendationResponse {
  recommendation: string;
  match_score: number;
  reasons: string[];
  alternatives: string[];
}

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8001";

export async function fetchAIRecommendation(
  payload: RecommendationRequest
): Promise<RecommendationResponse> {
  const response = await fetch(`${AI_ENGINE_URL}/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `AI Recommendation failed with status ${response.status}`
    );
  }

  return response.json();
}