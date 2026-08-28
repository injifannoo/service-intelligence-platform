# AI Roadmap Document

Version: 1.0

---

# Table of Contents

1. AI Vision
2. AI Strategy
3. AI Architecture
4. AI Features
5. Data Strategy
6. AI Development Phases
7. Machine Learning Models
8. LLM Integration
9. AI Pipeline
10. AI Evaluation
11. Future AI Capabilities

---

# 1. AI Vision

The goal of AI in this platform is to transform a traditional business directory into an intelligent decision-making system.

The AI should help users answer:

"Which service provider is the best choice for my specific needs, and why?"

---

# 2. AI Strategy

The AI system will focus on:

- Understanding user intent
- Processing large amounts of reviews
- Finding hidden patterns
- Ranking organizations
- Providing personalized recommendations
- Helping businesses improve

---

# 3. AI Architecture

High-level AI architecture:

# 3. AI Architecture

```mermaid
flowchart TD
    User[User Natural Language Query] --> NLP[Query Processing & Embedding Gen]
    NLP --> HybridSearch[Hybrid Search Engine]

    subgraph VectorDB[PostgreSQL + pgvector]
        Dense[HNSW Cosine Vector Index]
        Sparse[BM25 / Full-Text Search]
    end

    HybridSearch --> Dense
    HybridSearch --> Sparse

    Dense --> Rerank[Reranking & Recommendation]
    Sparse --> Rerank
    Rerank --> Response[AI Search Response]

    Reviews[Customer Reviews] --> Celery[Async Celery Task Queue]
    Celery --> Sentiment[Sentiment Analysis & Summarization]
    Sentiment --> Insight[Aggregated Insights]
    Insight --> Dashboard[Organization Dashboard]

```

---

# 4. AI Features

# 4.1 AI Semantic Search

## Purpose

Allow users to search naturally.

Traditional:

```
hotel bole
```

AI Search:

```
Find a clean affordable hotel near Bole Airport with breakfast
```

AI understands:

- Location
- Budget
- Preferences
- Intent

---

## Technology

Initial:

- PostgreSQL search

Advanced:

- Embeddings
- Vector database
- LLM reranking

---

# 4.2 AI Recommendation Engine

## Purpose

Recommend the best providers for each user.

Inputs:

```
User preference

Location

Budget

Ratings

Reviews

Past behavior
```

Output:

```
Recommended organizations

+

Explanation
```

Example:

"Recommended because it has high customer satisfaction, affordable pricing, and positive reviews."

---

# 4.3 Review Sentiment Analysis

## Purpose

Understand customer opinions.

Input:

```
Customer review text
```

Output:

```
Positive

Negative

Neutral
```

Example:

Review:

"Excellent service but slow response."

AI:

Positive:

Service quality

Negative:

Response time

---

# 4.4 AI Review Summary(Asynchronous Execution)

## Execution Model

To prevent API timeouts during heavy LLM inference:

- Triggered asynchronously via Celery task queue (`POST /api/v1/organizations/{id}/ai/review-summary/`).
- Client receives a `202 Accepted` status with a `task_id` for background polling (`/api/v1/ai/tasks/{task_id}/`).
- Outputs are cached in PostgreSQL `ai_insight` table to minimize LLM token consumption.

---

## Purpose

Convert hundreds of reviews into useful information.

Example:

Input:

```
500 reviews
```

Output:

```
Strengths:

- Friendly staff
- Good quality


Weaknesses:

- Expensive
- Long waiting time
```

---

# 4.5 AI Business Intelligence

## Purpose

Help organizations improve.

Example:

AI Insight:

"Customer satisfaction decreased 15% because customers mention delayed responses."

---

# 5. Data Strategy

AI depends on quality data.

Data sources:

## Internal Data

- Organization profiles
- Services
- Reviews
- User behavior

## External Data

- Public business information
- Partner data
- APIs

---

# Data Pipeline

```mermaid
flowchart LR

Source[Data Sources]

Source --> Collection[Data Collection]

Collection --> Cleaning[Data Cleaning]

Cleaning --> Storage[Database]

Storage --> Processing[AI Processing]

Processing --> Models[AI Models]

Models --> Insights[Business Insights]

```

---

# 6. AI Development Phases

```markdown
# Phase 1: AI Baseline & Async Summarization

- **Timeline:** MVP Launch
- **Workspace Location:** `backend/features/reviews/` & `ai-engine/prompts/`
- **Capabilities:**
  - Asynchronous LLM review summarization via Celery tasks.
  - Sentiment classification and store prompt files in `ai-engine/prompts/`.
- **Infrastructure:** Django REST Framework + Celery + Redis + OpenAI/HuggingFace APIs.

---

# Phase 2: Native Semantic & Hybrid Search

- **Timeline:** MVP + 2-3 months
- **Workspace Location:** `backend/features/services_directory/`
- **Capabilities:**
  - Natural language semantic search using `pgvector` with HNSW indexing.
  - Hybrid search filters (Category + Budget + Cosine Vector Distance).
- **Infrastructure:** PostgreSQL `pgvector` extension + embedding generation models.

---

# Phase 3: Recommendation System

Timeline:

6-12 months

Features:

- Personalized ranking
- User preference learning

Technology:

- Machine learning models
- Ranking algorithms

---

# Phase 4: Advanced AI Platform

Timeline:

12+ months

Features:

- AI business advisor
- Market prediction
- Automated insights

---

# 7. Machine Learning Models

## Classification Models

Used for:

- Sentiment classification
- Review categories

Examples:

- Logistic Regression
- BERT
- Transformers

---

## Ranking Models

Used for:

- Organization ranking
- Recommendations

Examples:

- Learning to Rank
- Gradient Boosting

---

## Recommendation Models

Methods:

## Content-based

Uses:

- Service similarity
- Industry
- Features

---

## Collaborative Filtering

Uses:

- User behavior
- Similar users

---

# 8. LLM Integration

Possible models:

## Commercial APIs

Examples:

- OpenAI models
- Google Gemini
- Anthropic Claude

---

## Open Source Models

Examples:

- Llama
- Mistral

---

# LLM Uses

- Summarization
- Question answering
- Explanation generation
- AI assistant

---

# Prompt Management

Store prompts:
```

ai-engine/

prompts/

review_summary.txt

recommendation.txt

assistant.txt

````

---

# 9. AI Pipeline & Background Processing

Complete workflow:

```mermaid
flowchart LR
    A[New Review Submitted] --> B[Trigger Celery Worker]
    B --> C[Text Cleaning & Normalization]
    C --> D[Embedding Gen & Sentiment Classification]
    D --> E[Save Embeddings to pgvector]
    E --> F[LLM Summarization Task]
    F --> G[Cache Output in ai_insight Table]
    G --> H[Update Business Dashboard]

````

---

# 10. AI Evaluation

AI quality must be measured.

Metrics:

## Search

- Search relevance
- Click-through rate

---

## Recommendation

- Accuracy
- Conversion rate

---

## Sentiment

- Precision
- Recall
- F1 Score

---

## AI Response

Evaluate:

- Correctness
- Helpfulness
- Safety

---

# 11. Future AI Capabilities

Future features:

## AI Service Advisor

User asks:

"Which software company should I choose?"

AI responds:

with recommendations and reasoning.

---

## Predictive Analytics

Predict:

- Customer satisfaction
- Market trends
- Business performance

---

## AI Agents

Automate:

- Data collection
- Business analysis
- Customer support

---

# Final AI Strategy

The AI evolution:

```
AI Assistant

↓

AI Search Engine

↓

AI Recommendation Engine

↓

AI Business Intelligence

↓

AI Decision Infrastructure
```

---

End of Document
