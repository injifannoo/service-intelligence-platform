from decimal import Decimal
import logging

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.ai_client import AIEngineClient

from features.organizations.models import (
    Industry,
    Organization,
    SubscriptionStatus,
    SubscriptionTier,
    VerificationStatus,
)
from features.reviews.models import AIInsight, Review, ReviewVerificationTier
from features.services.models import Category, Service
from features.users.models import User

logger = logging.getLogger(__name__)

DEMO_INDUSTRIES = (
    ("Software & Cloud Engineering", "Enterprise software, cloud infrastructure, and DevOps providers."),
    ("FinTech & Digital Payments", "Payment gateways, core banking integrations, and financial software."),
    ("Data Science & AI Solutions", "Applied machine learning, NLP, and business intelligence consultancies."),
    ("Cybersecurity & Compliance", "Security audits, penetration testing, and regulatory compliance."),
    ("Digital Product Design", "UX research, interface design, and design systems."),
)

DEMO_ORGANIZATIONS = [
    {
        "slug": "addis-cloud-systems",
        "name": "Addis Cloud Systems",
        "tagline": "Resilient cloud infrastructure, Kubernetes, and DevOps engineering in East Africa",
        "description": (
            "Addis Cloud Systems helps Ethiopian banks, telecom operators, and high-growth startups "
            "architect, migrate, and operate high-availability cloud and hybrid infrastructure."
        ),
        "industry": "Software & Cloud Engineering",
        "location": "Bole Sub-City, Addis Ababa",
        "phone": "+251-11-667-4120",
        "email": "hello@addiscloud.et",
        "website": "https://addiscloud.et",
        "business_hours": "Mon-Fri 08:30-18:00 EAT",
        "founded": 2019,
        "size": "50-200",
        "price_tier": 3,
        "response_hours": 4,
        "certifications": ["ISO 27001", "AWS Partner", "CNCF Member"],
        "industries_served": ["Banking", "Telecom", "Enterprise"],
        "verification_status": VerificationStatus.VERIFIED,
        "is_phone_verified": True,
        "is_fayda_verified": True,
        "has_proof_of_purchase": True,
        "trust_score": 92,
        "plan_tier": SubscriptionTier.ENTERPRISE,
        "services": [
            ("Cloud Migration & Architecture", "Cloud & Infrastructure", "End-to-end AWS/GCP and local hybrid cloud architecture.", Decimal("120000.00")),
            ("24/7 Managed Kubernetes & SRE", "Support & Maintenance", "Continuous cluster monitoring, incident response, and SLA management.", Decimal("85000.00")),
        ],
        "reviews": [
            {
                "user_email": "verified@asip.dev",
                "rating": 5,
                "rating_technical": 5,
                "rating_communication": 5,
                "rating_delivery": 5,
                "rating_value": 4,
                "title": "Zero-downtime core infrastructure migration",
                "comment": "Their SRE engineers migrated our production workloads ahead of schedule with crystal-clear documentation and rapid incident response.",
                "tier": ReviewVerificationTier.FAYDA_VERIFIED,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.94,
                "positive_aspects": ["Zero-downtime migration", "Strong SRE expertise", "Clear documentation"],
                "negative_aspects": [],
                "provider_response": "Thank you for trusting Addis Cloud Systems with your core migration!",
            },
            {
                "user_email": "premium@asip.dev",
                "rating": 5,
                "rating_technical": 5,
                "rating_communication": 4,
                "rating_delivery": 5,
                "rating_value": 5,
                "title": "Reliable DevOps automation partner",
                "comment": "Cut our deployment cycle from days to minutes using CI/CD pipelines and automated observability.",
                "tier": ReviewVerificationTier.VERIFIED_BUYER,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.91,
                "positive_aspects": ["CI/CD automation", "Fast delivery"],
                "negative_aspects": [],
                "provider_response": "",
            },
        ],
        "insight": {
            "summary": "Clients consistently praise Addis Cloud Systems for zero-downtime migrations, deep Kubernetes/SRE expertise, and disciplined CI/CD automation.",
            "overall_consensus": "STRONGLY_RECOMMENDED",
            "sentiment_positive": 94,
            "sentiment_neutral": 6,
            "sentiment_negative": 0,
            "sentiment_score": 0.93,
            "strengths": ["Enterprise SRE reliability", "Fast incident response (~4h)", "ISO 27001 security rigor"],
            "weaknesses": ["Premium enterprise pricing"],
            "main_complaint": "Higher upfront retainer compared to smaller shops",
            "recommendation": "Ideal for regulated financial and enterprise teams requiring mission-critical uptime.",
        },
    },
    {
        "slug": "abyssinia-fintech-labs",
        "name": "Abyssinia FinTech Labs",
        "tagline": "Custom mobile banking, Chapa/Telebirr integrations, and payment orchestration",
        "description": (
            "Abyssinia FinTech Labs builds secure mobile wallets, merchant checkout SDKs, and "
            "loan origination platforms tailored for Ethiopian financial institutions and SMEs."
        ),
        "industry": "FinTech & Digital Payments",
        "location": "Kazanchis, Addis Ababa",
        "phone": "+251-11-558-9034",
        "email": "contact@abyssiniafintech.et",
        "website": "https://abyssiniafintech.et",
        "business_hours": "Mon-Sat 08:30-18:30 EAT",
        "founded": 2021,
        "size": "10-50",
        "price_tier": 2,
        "response_hours": 6,
        "certifications": ["PCI-DSS Ready", "NBE Sandbox Partner"],
        "industries_served": ["FinTech", "Microfinance", "E-Commerce"],
        "verification_status": VerificationStatus.VERIFIED,
        "is_phone_verified": True,
        "is_fayda_verified": True,
        "has_proof_of_purchase": True,
        "trust_score": 88,
        "plan_tier": SubscriptionTier.PRO,
        "services": [
            ("Payment Gateway & Wallet Integration", "Custom Development", "Unified Chapa, Telebirr, and bank transfer API orchestration.", Decimal("65000.00")),
            ("Custom FinTech Web & Mobile App", "Custom Development", "Full-stack React/Next.js and Flutter applications for financial workflows.", Decimal("95000.00")),
        ],
        "reviews": [
            {
                "user_email": "customer@asip.dev",
                "rating": 5,
                "rating_technical": 5,
                "rating_communication": 5,
                "rating_delivery": 4,
                "rating_value": 5,
                "title": "Smooth Telebirr and Chapa checkout launch",
                "comment": "Very strong domain knowledge in Ethiopian payment rails. Handled webhook idempotency and reconciliation cleanly.",
                "tier": ReviewVerificationTier.VERIFIED_BUYER,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.89,
                "positive_aspects": ["Local payment integration expertise", "Clean reconciliation logic"],
                "negative_aspects": ["Minor UI polish delay on final sprint"],
                "provider_response": "Appreciate the feedback! Glad the payment reconciliation is running smoothly.",
            },
            {
                "user_email": "verified@asip.dev",
                "rating": 4,
                "rating_technical": 5,
                "rating_communication": 4,
                "rating_delivery": 4,
                "rating_value": 5,
                "title": "Great value for mid-market fintech teams",
                "comment": "Strong engineering quality at a fair mid-range budget. Weekly sprint demos kept stakeholders aligned.",
                "tier": ReviewVerificationTier.FAYDA_VERIFIED,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.82,
                "positive_aspects": ["High value for money", "Transparent sprint demos"],
                "negative_aspects": [],
                "provider_response": "",
            },
        ],
        "insight": {
            "summary": "Recognized for deep expertise in Ethiopian digital payment integrations, clean reconciliation architecture, and strong mid-market value.",
            "overall_consensus": "RECOMMENDED",
            "sentiment_positive": 88,
            "sentiment_neutral": 10,
            "sentiment_negative": 2,
            "sentiment_score": 0.86,
            "strengths": ["Local payment gateway mastery", "Strong cost-to-quality ratio", "Transparent sprint cadence"],
            "weaknesses": ["Occasional final-sprint UI polish delays"],
            "main_complaint": "Minor timeline extensions during UAT sign-off",
            "recommendation": "Top choice for startups and SMEs launching payment-enabled web or mobile platforms.",
        },
    },
    {
        "slug": "sheger-ai-analytics",
        "name": "Sheger AI & Data Analytics",
        "tagline": "Applied NLP, Amharic/Afaan Oromoo language AI, and predictive business intelligence",
        "description": (
            "Sheger AI & Data Analytics designs custom RAG assistants, customer churn models, "
            "and multilingual analytics pipelines for Ethiopian enterprises and NGOs."
        ),
        "industry": "Data Science & AI Solutions",
        "location": "CMC / Ayat Corridor, Addis Ababa",
        "phone": "+251-11-647-2219",
        "email": "info@shegerai.et",
        "website": "https://shegerai.et",
        "business_hours": "Mon-Fri 09:00-17:30 EAT",
        "founded": 2022,
        "size": "10-50",
        "price_tier": 2,
        "response_hours": 8,
        "certifications": ["Google Cloud AI Partner"],
        "industries_served": ["Telecom", "Agriculture", "Healthcare", "Banking"],
        "verification_status": VerificationStatus.VERIFIED,
        "is_phone_verified": True,
        "is_fayda_verified": False,
        "has_proof_of_purchase": True,
        "trust_score": 85,
        "plan_tier": SubscriptionTier.PRO,
        "services": [
            ("Enterprise RAG & Multilingual Chatbot", "Data & AI", "Document-grounded AI assistants supporting English, Amharic, and Afaan Oromoo.", Decimal("75000.00")),
            ("Predictive Churn & Demand Forecasting", "Data & AI", "End-to-end ML pipelines with explainable dashboards.", Decimal("70000.00")),
        ],
        "reviews": [
            {
                "user_email": "premium@asip.dev",
                "rating": 5,
                "rating_technical": 5,
                "rating_communication": 4,
                "rating_delivery": 4,
                "rating_value": 5,
                "title": "Impressive multilingual RAG accuracy",
                "comment": "Built a semantic search and support assistant over our internal policy PDFs with accurate citations.",
                "tier": ReviewVerificationTier.VERIFIED_BUYER,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.90,
                "positive_aspects": ["Accurate RAG citations", "Multilingual support"],
                "negative_aspects": [],
                "provider_response": "",
            },
        ],
        "insight": {
            "summary": "Standout specialist in multilingual retrieval-augmented generation (RAG) and practical predictive analytics for Ethiopian organizations.",
            "overall_consensus": "RECOMMENDED",
            "sentiment_positive": 90,
            "sentiment_neutral": 10,
            "sentiment_negative": 0,
            "sentiment_score": 0.90,
            "strengths": ["Multilingual NLP capability", "Grounded citation accuracy", "Practical ROI focus"],
            "weaknesses": ["Smaller team capacity for simultaneous large rollouts"],
            "main_complaint": "2-week lead time to kick off new discovery sprints",
            "recommendation": "Best fit for organizations adopting AI search, customer support automation, or predictive analytics.",
        },
    },
    {
        "slug": "entoto-cyber-shield",
        "name": "Entoto Cyber Shield",
        "tagline": "Application penetration testing, SOC advisory, and ISO 27001 readiness",
        "description": (
            "Entoto Cyber Shield provides offensive security assessments, API hardening, and "
            "compliance auditing for financial institutions and digital platforms."
        ),
        "industry": "Cybersecurity & Compliance",
        "location": "Lideta, Addis Ababa",
        "phone": "+251-11-515-7801",
        "email": "security@entotocyber.et",
        "website": "https://entotocyber.et",
        "business_hours": "Mon-Fri 08:30-17:30 EAT",
        "founded": 2020,
        "size": "10-50",
        "price_tier": 3,
        "response_hours": 6,
        "certifications": ["CREST Registered", "ISO 27001 Lead Auditor"],
        "industries_served": ["Banking", "Insurance", "Government"],
        "verification_status": VerificationStatus.VERIFIED,
        "is_phone_verified": True,
        "is_fayda_verified": True,
        "has_proof_of_purchase": True,
        "trust_score": 89,
        "plan_tier": SubscriptionTier.PRO,
        "services": [
            ("Web & Mobile API Penetration Testing", "Consulting", "OWASP ASVS/Top-10 security testing with actionable remediation guidance.", Decimal("60000.00")),
            ("ISO 27001 Gap Assessment & Hardening", "Consulting", "Information security management policies, controls, and audit prep.", Decimal("90000.00")),
        ],
        "reviews": [
            {
                "user_email": "customer@asip.dev",
                "rating": 5,
                "rating_technical": 5,
                "rating_communication": 5,
                "rating_delivery": 5,
                "rating_value": 4,
                "title": "Thorough pen-test report with clear repro steps",
                "comment": "Found subtle authorization edge cases before our public launch and re-tested all fixes within 48 hours.",
                "tier": ReviewVerificationTier.VERIFIED_BUYER,
                "sentiment_label": "POSITIVE",
                "sentiment_score": 0.92,
                "positive_aspects": ["Deep security findings", "Fast re-testing"],
                "negative_aspects": [],
                "provider_response": "",
            },
        ],
        "insight": {
            "summary": "Trusted offensive security and compliance partner known for actionable penetration test findings and fast remediation re-testing.",
            "overall_consensus": "STRONGLY_RECOMMENDED",
            "sentiment_positive": 92,
            "sentiment_neutral": 8,
            "sentiment_negative": 0,
            "sentiment_score": 0.92,
            "strengths": ["Thorough OWASP testing", "Fast 48h fix verification", "Regulatory compliance expertise"],
            "weaknesses": ["Premium assessment rates"],
            "main_complaint": "Limited availability for rush engagements under 5 days",
            "recommendation": "Essential pre-launch security partner for fintech and enterprise applications.",
        },
    },
]


class Command(BaseCommand):
    help = "Populate idempotent demo industries, Addis Ababa organizations, services, reviews, AI insights, and pgvector embeddings."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-embeddings",
            action="store_true",
            help="Skip calling the AI Engine to generate 768-d pgvector embeddings.",
        )


    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Ensure demo users exist first
        call_command("seed_users")
        ai_client = AIEngineClient()    

        owner = User.objects.filter(email="owner@asip.dev").first()
        users_by_email = {
            u.email: u
            for u in User.objects.filter(
                email__in=["customer@asip.dev", "verified@asip.dev", "premium@asip.dev"]
            )
        }

        # 2. Seed Industries
        industries_by_name = {}
        for name, description in DEMO_INDUSTRIES:
            industry, _ = Industry.objects.get_or_create(
                name=name,
                defaults={"description": description},
            )
            industries_by_name[name] = industry

        categories_by_name = {c.name: c for c in Category.objects.all()}
        now = timezone.now()

        # 3. Seed Organizations, Services, Reviews & Cached AI Insights
        for entry in DEMO_ORGANIZATIONS:
            industry = industries_by_name[entry["industry"]]
            org, created = Organization.objects.update_or_create(
                slug=entry["slug"],
                defaults={
                    "name": entry["name"],
                    "tagline": entry["tagline"],
                    "description": entry["description"],
                    "industry": industry,
                    "owner": owner,
                    "location": entry["location"],
                    "phone": entry["phone"],
                    "email": entry["email"],
                    "website": entry["website"],
                    "business_hours": entry["business_hours"],
                    "founded": entry["founded"],
                    "size": entry["size"],
                    "price_tier": entry["price_tier"],
                    "response_hours": entry["response_hours"],
                    "certifications": entry["certifications"],
                    "industries_served": entry["industries_served"],
                    "verification_status": entry["verification_status"],
                    "is_phone_verified": entry["is_phone_verified"],
                    "is_fayda_verified": entry["is_fayda_verified"],
                    "has_proof_of_purchase": entry["has_proof_of_purchase"],
                    "verified_at": now,
                    "trust_score": entry["trust_score"],
                    "plan_tier": entry["plan_tier"],
                    "subscription_status": SubscriptionStatus.ACTIVE,
                },
            )

            created_services = []
            for svc_name, cat_name, svc_desc, svc_price in entry["services"]:
                svc, _ = Service.objects.update_or_create(
                    organization=org,
                    name=svc_name,
                    defaults={
                        "category": categories_by_name.get(cat_name),
                        "description": svc_desc,
                        "price": svc_price,
                        "status": True,
                    },
                )
                created_services.append(svc)

            for idx, rev in enumerate(entry["reviews"]):
                reviewer = users_by_email.get(rev["user_email"])
                if not reviewer:
                    continue
                target_service = created_services[idx % len(created_services)] if created_services else None
                Review.objects.update_or_create(
                    organization=org,
                    user=reviewer,
                    defaults={
                        "service": target_service,
                        "rating": rev["rating"],
                        "rating_technical": rev["rating_technical"],
                        "rating_communication": rev["rating_communication"],
                        "rating_delivery": rev["rating_delivery"],
                        "rating_value": rev["rating_value"],
                        "title": rev["title"],
                        "comment": rev["comment"],
                        "verified": True,
                        "verification_tier": rev["tier"],
                        "provider_response": rev["provider_response"],
                        "provider_responded_at": now if rev["provider_response"] else None,
                        "sentiment_label": rev["sentiment_label"],
                        "sentiment_score": rev["sentiment_score"],
                        "positive_aspects": rev["positive_aspects"],
                        "negative_aspects": rev["negative_aspects"],
                    },
                )

            ins = entry["insight"]
            AIInsight.objects.update_or_create(
                organization=org,
                defaults={
                    "summary": ins["summary"],
                    "overall_consensus": ins["overall_consensus"],
                    "sentiment_positive": ins["sentiment_positive"],
                    "sentiment_neutral": ins["sentiment_neutral"],
                    "sentiment_negative": ins["sentiment_negative"],
                    "sentiment_score": ins["sentiment_score"],
                    "strengths": ins["strengths"],
                    "weaknesses": ins["weaknesses"],
                    "main_complaint": ins["main_complaint"],
                    "recommendation": ins["recommendation"],
                    "reviews_analyzed_count": len(entry["reviews"]),
                },
            )

            # 4. Generate 768-d pgvector embedding via AI Engine when available
            if not options["skip_embeddings"]:
                embed_text = (
                    f"{org.name}. {org.tagline}. {org.description} "
                    f"Industry: {industry.name}. Location: {org.location}. "
                    f"Services: {', '.join(s.name for s in created_services)}."
                )
                try:
                    vector = ai_client.generate_embedding(embed_text)
                    if vector:
                        org.embedding = vector
                        org.save(update_fields=["embedding", "updated_at"])
                except Exception as exc:  # noqa: BLE001
                    logger.warning("Skipping embedding for %s: %s", org.slug, exc)

            verb = "Created" if created else "Updated"
            self.stdout.write(f"{verb} demo organization: {org.name} ({org.slug})")

        self.stdout.write(self.style.SUCCESS("Platform demo seeding complete."))