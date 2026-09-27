// Five realistic, fully fictional resume / job-description pairs for performance metrics.
// Deliberately varied: different fields, seniority levels, and degrees of fit.

import type { RealisticCase } from "../types";

export const REALISTIC_CASES: RealisticCase[] = [
  {
    id: "M1",
    title: "Marketing analyst → Data Analyst (moderate fit)",
    resume: `Jordan Blake
Marketing Analyst · jordan.blake@example.com · Portland, OR (fictional details)

SUMMARY
Marketing analyst with 3 years of experience turning campaign data into weekly reports and recommendations.

EXPERIENCE
Marketing Analyst — Fernwood Outdoor Co. (fictional), Feb 2022 – Present
- Wrote SQL queries in BigQuery to pull campaign performance data.
- Built weekly performance dashboards in Looker Studio for the marketing team.
- Ran A/B tests on email subject lines and summarized the results for managers.
- Cleaned and merged spreadsheet data in Excel using pivot tables and XLOOKUP.
- Presented monthly channel reports to the head of marketing.

Marketing Coordinator — Fernwood Outdoor Co. (fictional), Jun 2020 – Jan 2022
- Scheduled social media posts and tracked engagement metrics.
- Maintained the product catalog spreadsheet.

EDUCATION
B.A. Economics — Clearwater State University (fictional), 2020

SKILLS
SQL, BigQuery, Looker Studio, Excel, Google Analytics, A/B testing`,
    jobDescription: `Data Analyst — Northstar Grocers (fictional)

About the role
Northstar Grocers is looking for a Data Analyst to support merchandising and supply-chain teams with reporting and analysis.

Responsibilities
- Build and maintain Tableau dashboards for merchandising leadership.
- Write complex SQL to analyze sales and inventory data.
- Partner with stakeholders to define KPIs.
- Automate recurring reports.

Requirements
- 2+ years of experience in a data or analytics role.
- Advanced SQL (window functions, CTEs).
- Experience with Tableau or a similar BI tool.
- Experience with Python or R for analysis.
- Strong communication skills.
- Bachelor's degree in a quantitative field.

Nice to have
- Retail or e-commerce experience.
- Familiarity with statistical testing.`,
  },
  {
    id: "M2",
    title: "Java/Spring engineer → Go backend engineer (partial fit)",
    resume: `Riya Desai
Software Engineer · riya.desai@example.com

EXPERIENCE
Software Engineer — Kestrel Insurance (fictional), Aug 2019 – Present
- Developed microservices in Java 17 and Spring Boot for policy management.
- Designed PostgreSQL schemas and tuned slow queries.
- Built REST APIs consumed by the web and mobile apps.
- Introduced Kafka consumers to process claim events asynchronously.
- Wrote unit and integration tests with JUnit and Testcontainers.
- Participated in on-call rotation and incident reviews.

EDUCATION
B.Tech. Computer Science — Silverlake Institute of Technology (fictional), 2019

SKILLS
Java, Spring Boot, PostgreSQL, Kafka, Docker, REST, JUnit, Git, Linux`,
    jobDescription: `Backend Engineer (Go) — Quartzline Payments (fictional)

We build payment infrastructure used by thousands of merchants.

Requirements
- 4+ years of backend engineering experience.
- Professional experience with Go.
- Experience designing gRPC or REST APIs.
- Strong PostgreSQL skills.
- Experience with event-driven systems (Kafka, NATS, or similar).
- Experience operating services in production, including on-call.

Nice to have
- Payments or fintech domain experience.
- Kubernetes experience.
- Experience with observability tools (Prometheus, OpenTelemetry).`,
  },
  {
    id: "M3",
    title: "Med-surg RN → ICU RN (partial fit, non-tech)",
    resume: `Grace Mbeki, RN
grace.mbeki@example.com

LICENSES & CERTIFICATIONS
- Registered Nurse (fictional state license)
- Basic Life Support (BLS)

EXPERIENCE
Registered Nurse, Medical-Surgical Unit — St. Aldric Community Hospital (fictional), Jul 2021 – Present
- Provide care for a patient assignment of 5–6 adults on a 32-bed medical-surgical unit.
- Administer medications and IV therapy, and monitor patients after surgery.
- Educate patients and families on discharge instructions.
- Document care in the Epic electronic health record.
- Serve as a preceptor for new graduate nurses.

EDUCATION
Bachelor of Science in Nursing — Ridgeview University (fictional), 2021

SKILLS
Patient assessment, IV therapy, Medication administration, Epic, Patient education`,
    jobDescription: `ICU Registered Nurse — Lakemont Medical Center (fictional)

Requirements
- Active RN license.
- 2+ years of acute care nursing experience; ICU experience preferred.
- BLS and ACLS certification required.
- Experience with ventilated patients and titrating vasoactive drips.
- Experience with Epic EHR.
- BSN required.

Nice to have
- CCRN certification.
- Experience precepting or charge nurse experience.`,
  },
  {
    id: "M4",
    title: "Social media specialist → Marketing Coordinator (strong fit)",
    resume: `Luis Ortega
Social Media Specialist · luis.ortega@example.com

EXPERIENCE
Social Media Specialist — Brightbloom Cafés (fictional), Mar 2022 – Present
- Plan and publish content across Instagram, TikTok, and Facebook for 14 café locations.
- Grew Instagram followers from 8,000 to 21,000 over two years.
- Coordinate monthly promotions with store managers and the design team.
- Write copy for email newsletters sent through Mailchimp.
- Track campaign results in Google Analytics and report them monthly.

Marketing Intern — Brightbloom Cafés (fictional), Jun 2021 – Feb 2022
- Organized in-store event calendars.
- Created graphics in Canva for social posts.

EDUCATION
B.A. Communications — Hollins Bay College (fictional), 2021

SKILLS
Social media strategy, Copywriting, Mailchimp, Canva, Google Analytics, Event coordination`,
    jobDescription: `Marketing Coordinator — Tallgrass Fitness (fictional)

Responsibilities
- Coordinate multi-channel campaigns across social, email, and in-studio promotions.
- Manage the content calendar.
- Write copy for social posts and email newsletters.
- Track and report campaign performance.
- Work with studio managers to plan local events.

Requirements
- 2+ years of marketing experience.
- Experience with social media platforms and email marketing tools (e.g. Mailchimp).
- Strong writing skills.
- Experience with Google Analytics.
- Bachelor's degree in Marketing, Communications, or related field.

Nice to have
- Basic graphic design skills (Canva or Adobe).
- Experience in fitness, hospitality, or retail.`,
  },
  {
    id: "M5",
    title: "Graphic designer → Product (UX) Designer (weak–moderate fit)",
    resume: `Mei Tanaka
Graphic Designer · mei.tanaka@example.com · Portfolio: example.com/mei (fictional)

EXPERIENCE
Graphic Designer — Inkwell Print Studio (fictional), Sep 2020 – Present
- Design brand identities, packaging, and print collateral for small businesses.
- Create social media graphics and web banners in Adobe Illustrator and Photoshop.
- Redesigned the studio's website layout in Figma and handed it off to a developer.
- Present design concepts to clients and iterate based on feedback.

Freelance Designer, 2019 – 2020
- Designed logos and flyers for local nonprofits.

EDUCATION
B.F.A. Graphic Design — Amberfield School of Art (fictional), 2019

SKILLS
Adobe Illustrator, Photoshop, InDesign, Figma, Typography, Branding`,
    jobDescription: `Product Designer — Wayfinder Health (fictional)

Help us design a patient-scheduling app used by clinics across the region.

Requirements
- 3+ years of product or UX design experience for web or mobile apps.
- Strong Figma skills, including components and auto layout.
- Experience conducting user research and usability testing.
- Experience creating wireframes, user flows, and interactive prototypes.
- Ability to work closely with engineers and product managers.
- A portfolio showing end-to-end product design work.

Nice to have
- Experience with design systems.
- Healthcare or accessibility (WCAG) experience.`,
  },
];
