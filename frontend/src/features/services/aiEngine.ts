import { ServiceProvider, AiRecommendationResult } from '../../types/service';
import { ETHIOPIAN_PROVIDERS } from './mockData';

export interface IAiEngineService {
  getRecommendation(query: string, candidateProviders: ServiceProvider[]): Promise<AiRecommendationResult>;
}

class FastApiAiEngineService implements IAiEngineService {
  private apiUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8001';

  async getRecommendation(query: string, candidates: ServiceProvider[]): Promise<AiRecommendationResult> {
    try {
      // 1. Guard against Pydantic's min_length=3 validation constraint on the query
      const sanitizedQuery = query && query.trim().length >= 3 
        ? query.trim() 
        : 'Default service recommendation query';

      // 2. Map candidate objects to match ProviderInput schema aliases
      const mappedProviders = candidates.map((provider) => ({
        id: provider.id,
        name: provider.name,
        description: provider.description,
        location: provider.location,
        servicesOffered: provider.servicesOffered || [],
        rating: Number(provider.rating) || 0,
        priceLevel: provider.priceLevel || null,
      }));

      const response = await fetch(`${this.apiUrl}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sanitizedQuery,
          providers: mappedProviders,
        }),
      });

      // 3. Robust Error Inspection
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`FastAPI Error [Status ${response.status}]:`, errorText);
        throw new Error(`FastAPI responded with status: ${response.status}`);
      }

      const data = await response.json();

      // 4. Map response supporting both snake_case and camelCase aliases
      return {
        matchScore: data.matchScore ?? data.match_score ?? 0,
        recommendedProvider: data.recommendedProvider ?? data.recommended_provider ?? candidates[0],
        alternativeProviders: data.alternativeProviders ?? data.alternative_providers ?? [],
        reasoning: data.reasoning ?? data.reasons ?? [],
        keyDecisionFactors: data.keyDecisionFactors ?? data.key_decision_factors ?? [],
      };
    } catch (error) {
      console.error('FastAPI Engine Error, falling back to local evaluation:', error);

      return {
        matchScore: 0,
        recommendedProvider: candidates[0] || ETHIOPIAN_PROVIDERS[0],
        alternativeProviders: [],
        reasoning: ['Backend recommendation service unreachable or schema validation failed.'],
        keyDecisionFactors: [],
      };
    }
  }
}

export const aiEngineService: IAiEngineService = new FastApiAiEngineService();