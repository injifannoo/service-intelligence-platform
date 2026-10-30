export interface ServiceProvider {
  id: string;
  name: string;
  category: 'Software & IT' | 'Cloud & DevOps' | 'AI & Data Science' | 'Digital Marketing' | 'Business Consulting';
  location: string;
  city: 'Addis Ababa' | 'Hawassa' | 'Bishoftu' | 'Adama' | 'Dire Dawa';
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  hourlyRate: string;
  description: string;
  verified: boolean;
  featured: boolean;
  yearEstablished: number;
  teamSize: string;
  servicesOffered: string[];
  contactEmail: string;
  contactPhone: string;
  website: string;
  address: string;
}

export interface SearchFilters {
  query: string;
  category: string;
  city: string;
  maxPrice: string;
  minRating: number;
}

export interface RecommendationRequest {
  query: string;
  preferredCity?: string;
  maxBudgetLevel?: string;
}

export interface AiRecommendationResult {
  matchScore: number;
  recommendedProvider: ServiceProvider;
  alternativeProviders: ServiceProvider[];
  reasoning: string[];
  keyDecisionFactors: {
    factor: string;
    score: number;
    description: string;
  }[];
}