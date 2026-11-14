export type Review = {
  author: string;
  rating: number;
  text: string;
  date: string;
  verified: "purchase" | "phone" | "fayda" | "email";
};

export type Org = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  services: string[];
  industries: string[];
  location: string;
  founded: number;
  size: "1-10" | "11-50" | "51-200" | "200+";
  priceTier: 1 | 2 | 3;
  rating: number;
  reviewCount: number;
  trustScore: number;
  responseHours: number;
  verified: boolean;
  certifications: string[];
  sentiment: { positive: number; neutral: number; negative: number };
  strengths: string[];
  issues: string[];
  aiSummary: string;
  recommendation: string;
  satisfactionTrend: number[];
  reviews: Review[];
};

export const CATEGORIES = [
  "Software Development",
  "Mobile Apps",
  "IT Consulting",
  "Cloud & DevOps",
  "Cybersecurity",
  "UI/UX Design",
  "Digital Marketing",
  "Data & AI",
];

export const ORGS: Org[] = [
  {
    slug: "abyssinia-code-labs",
    name: "Abyssinia Code Labs",
    tagline: "Fintech and banking platforms built for Ethiopian scale.",
    category: "Software Development",
    services: ["Web platforms", "Core banking integration", "Payment gateways", "API development"],
    industries: ["Fintech", "Banking", "Telecom"],
    location: "Bole, Addis Ababa",
    founded: 2014,
    size: "51-200",
    priceTier: 3,
    rating: 4.7,
    reviewCount: 214,
    trustScore: 92,
    responseHours: 18,
    verified: true,
    certifications: ["ISO 27001", "Telebirr Partner", "NBE Vendor Registered"],
    sentiment: { positive: 86, neutral: 9, negative: 5 },
    strengths: ["Deep fintech expertise", "Secure architecture", "Reliable delivery"],
    issues: ["Premium pricing", "Long onboarding"],
    aiSummary:
      "Customers consistently praise Abyssinia Code Labs for secure, production-grade fintech systems and strong compliance knowledge. The main concern is cost, which some startups find high.",
    recommendation: "Offer a startup tier or phased engagement to convert price-sensitive leads.",
    satisfactionTrend: [78, 80, 82, 84, 83, 86, 88],
    reviews: [
      {
        author: "Hana T.",
        rating: 5,
        text: "They integrated Telebirr and CBE Birr into our wallet in six weeks. Very professional.",
        date: "2026-09-12",
        verified: "purchase",
      },
      {
        author: "Dawit M.",
        rating: 4,
        text: "Excellent quality, but the quote was well above our budget.",
        date: "2026-08-03",
        verified: "fayda",
      },
      {
        author: "Selam B.",
        rating: 5,
        text: "Their security review saved us from a serious audit finding.",
        date: "2026-07-21",
        verified: "phone",
      },
    ],
  },
  {
    slug: "entoto-digital",
    name: "Entoto Digital",
    tagline: "Agile product studio for founders shipping their first app.",
    category: "Mobile Apps",
    services: ["MVP development", "Flutter apps", "Product design", "Startup consulting"],
    industries: ["Startups", "E-commerce", "Education"],
    location: "Kazanchis, Addis Ababa",
    founded: 2019,
    size: "11-50",
    priceTier: 1,
    rating: 4.5,
    reviewCount: 132,
    trustScore: 85,
    responseHours: 6,
    verified: true,
    certifications: ["Google Developer Agency"],
    sentiment: { positive: 81, neutral: 12, negative: 7 },
    strengths: ["Affordable", "Fast response", "Agile process"],
    issues: ["Junior-heavy team", "Documentation gaps"],
    aiSummary:
      "Entoto Digital is the go-to choice for early-stage founders: affordable, quick to respond and comfortable with changing requirements. Larger clients mention thinner documentation.",
    recommendation: "Standardize handover documentation to win mid-size enterprise contracts.",
    satisfactionTrend: [74, 76, 79, 78, 80, 81, 83],
    reviews: [
      {
        author: "Yonas K.",
        rating: 5,
        text: "Built our MVP in 8 weeks on a startup budget. Weekly demos kept us aligned.",
        date: "2026-09-30",
        verified: "purchase",
      },
      {
        author: "Meron A.",
        rating: 4,
        text: "Great team, but handover docs were thin.",
        date: "2026-08-14",
        verified: "email",
      },
    ],
  },
  {
    slug: "lucy-cloud-systems",
    name: "Lucy Cloud Systems",
    tagline: "Cloud migration, DevOps and managed infrastructure.",
    category: "Cloud & DevOps",
    services: ["Cloud migration", "Kubernetes", "Managed hosting", "24/7 monitoring"],
    industries: ["Banking", "Government", "Healthcare"],
    location: "CMC, Addis Ababa",
    founded: 2016,
    size: "51-200",
    priceTier: 2,
    rating: 4.3,
    reviewCount: 98,
    trustScore: 81,
    responseHours: 48,
    verified: true,
    certifications: ["AWS Partner", "ISO 9001"],
    sentiment: { positive: 74, neutral: 15, negative: 11 },
    strengths: ["Technical depth", "Uptime reliability"],
    issues: ["Slow quotation response", "Slow weekend support"],
    aiSummary:
      "Clients trust Lucy Cloud Systems with critical infrastructure and report strong uptime. Response time on quotes and weekend tickets is the recurring complaint.",
    recommendation: "Reduce average quotation response time from 48 hours to 12 hours.",
    satisfactionTrend: [80, 78, 77, 75, 76, 74, 75],
    reviews: [
      {
        author: "Bethlehem G.",
        rating: 5,
        text: "Migrated our hospital system with zero downtime.",
        date: "2026-09-02",
        verified: "purchase",
      },
      {
        author: "Samuel F.",
        rating: 3,
        text: "Good engineers, but we waited three days for a quote.",
        date: "2026-08-19",
        verified: "phone",
      },
    ],
  },
  {
    slug: "habesha-secure",
    name: "Habesha Secure",
    tagline: "Penetration testing and security operations for regulated sectors.",
    category: "Cybersecurity",
    services: ["Penetration testing", "SOC as a service", "Compliance audits"],
    industries: ["Banking", "Fintech", "Government"],
    location: "Bole, Addis Ababa",
    founded: 2017,
    size: "11-50",
    priceTier: 3,
    rating: 4.8,
    reviewCount: 61,
    trustScore: 94,
    responseHours: 10,
    verified: true,
    certifications: ["INSA Certified", "OSCP Team", "ISO 27001 Lead Auditor"],
    sentiment: { positive: 91, neutral: 6, negative: 3 },
    strengths: ["Expert testers", "Clear reports", "Confidentiality"],
    issues: ["Limited availability"],
    aiSummary:
      "Habesha Secure has the highest trust score in its category, with clients highlighting expert-level findings and clear remediation reports. Booking lead times can be long.",
    recommendation: "Add capacity or a waitlist to capture demand lost to long lead times.",
    satisfactionTrend: [86, 88, 89, 90, 90, 91, 92],
    reviews: [
      {
        author: "Abel W.",
        rating: 5,
        text: "Found issues two previous vendors missed.",
        date: "2026-09-18",
        verified: "fayda",
      },
    ],
  },
  {
    slug: "sheba-ux",
    name: "Sheba UX Studio",
    tagline: "Research-led product and interface design.",
    category: "UI/UX Design",
    services: ["User research", "UI design", "Design systems", "Usability testing"],
    industries: ["Startups", "Fintech", "NGOs"],
    location: "Sarbet, Addis Ababa",
    founded: 2020,
    size: "1-10",
    priceTier: 2,
    rating: 4.6,
    reviewCount: 47,
    trustScore: 83,
    responseHours: 8,
    verified: false,
    certifications: [],
    sentiment: { positive: 84, neutral: 11, negative: 5 },
    strengths: ["Local user insight", "Beautiful interfaces"],
    issues: ["Small team capacity"],
    aiSummary:
      "Sheba UX is valued for grounding designs in real Ethiopian user research, including Amharic-first interfaces. Capacity is limited for large projects.",
    recommendation:
      "Complete verification to increase visibility in search results by an estimated 30%.",
    satisfactionTrend: [79, 81, 80, 83, 84, 84, 86],
    reviews: [
      {
        author: "Liya H.",
        rating: 5,
        text: "Their Amharic usability tests changed our onboarding completely.",
        date: "2026-09-08",
        verified: "email",
      },
    ],
  },
  {
    slug: "addis-data-works",
    name: "Addis Data Works",
    tagline: "Analytics, machine learning and AI solutions.",
    category: "Data & AI",
    services: ["Data warehousing", "BI dashboards", "Machine learning", "Amharic NLP"],
    industries: ["Telecom", "Agriculture", "Healthcare"],
    location: "Piassa, Addis Ababa",
    founded: 2018,
    size: "11-50",
    priceTier: 2,
    rating: 4.4,
    reviewCount: 73,
    trustScore: 84,
    responseHours: 24,
    verified: true,
    certifications: ["Microsoft Data Partner"],
    sentiment: { positive: 79, neutral: 14, negative: 7 },
    strengths: ["Amharic NLP", "Strong analysts"],
    issues: ["Project scope creep"],
    aiSummary:
      "Addis Data Works stands out for Amharic language models and practical dashboards. Some clients report timelines slipping as scope grows.",
    recommendation: "Introduce fixed-scope discovery sprints to reduce scope-creep complaints.",
    satisfactionTrend: [76, 77, 78, 78, 79, 80, 81],
    reviews: [
      {
        author: "Kalkidan S.",
        rating: 4,
        text: "Their Amharic sentiment model works surprisingly well.",
        date: "2026-09-25",
        verified: "purchase",
      },
    ],
  },
  {
    slug: "blue-nile-marketing",
    name: "Blue Nile Growth",
    tagline: "Performance marketing for tech brands.",
    category: "Digital Marketing",
    services: ["Social media", "Paid ads", "SEO", "Telegram growth"],
    industries: ["E-commerce", "Startups", "Hospitality"],
    location: "Megenagna, Addis Ababa",
    founded: 2021,
    size: "11-50",
    priceTier: 1,
    rating: 4.1,
    reviewCount: 88,
    trustScore: 76,
    responseHours: 12,
    verified: true,
    certifications: ["Meta Business Partner"],
    sentiment: { positive: 70, neutral: 18, negative: 12 },
    strengths: ["Telegram expertise", "Affordable packages"],
    issues: ["Inconsistent reporting"],
    aiSummary:
      "Blue Nile Growth is known for Telegram and TikTok growth on modest budgets. Clients want more consistent monthly reporting.",
    recommendation: "Ship a standard monthly performance report to all retainer clients.",
    satisfactionTrend: [72, 70, 71, 69, 70, 71, 72],
    reviews: [
      {
        author: "Ruth D.",
        rating: 4,
        text: "Grew our Telegram channel to 40k in four months.",
        date: "2026-09-11",
        verified: "phone",
      },
    ],
  },
  {
    slug: "simien-it",
    name: "Simien IT Consulting",
    tagline: "ERP, digital transformation and IT strategy.",
    category: "IT Consulting",
    services: ["ERP implementation", "IT strategy", "Odoo", "Training"],
    industries: ["Manufacturing", "Government", "NGOs"],
    location: "Bole, Addis Ababa",
    founded: 2012,
    size: "200+",
    priceTier: 2,
    rating: 4.2,
    reviewCount: 156,
    trustScore: 80,
    responseHours: 30,
    verified: true,
    certifications: ["Odoo Gold Partner", "PMP Certified Leads"],
    sentiment: { positive: 75, neutral: 15, negative: 10 },
    strengths: ["Experienced consultants", "Good training"],
    issues: ["Bureaucratic process", "Slow change requests"],
    aiSummary:
      "Simien IT is a dependable ERP partner with deep public-sector experience. Customers cite slow change-request handling.",
    recommendation: "Create a fast-track lane for small change requests under 5 days of effort.",
    satisfactionTrend: [77, 76, 78, 77, 79, 78, 80],
    reviews: [
      {
        author: "Tesfaye N.",
        rating: 4,
        text: "Odoo rollout went well, the training was excellent.",
        date: "2026-08-28",
        verified: "purchase",
      },
    ],
  },
];

export const getOrg = (slug: string) => ORGS.find((o) => o.slug === slug);
export const priceLabel = (t: number) => "Br".repeat(1) + " " + "$".repeat(t);
