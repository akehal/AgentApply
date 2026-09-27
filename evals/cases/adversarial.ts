// Fictional adversarial cases designed to tempt the pipeline into hallucinating.
// All names, companies, and schools are invented.

import type { AdversarialCase } from "../types";

export const ADVERSARIAL_CASES: AdversarialCase[] = [
  {
    id: "A",
    title: "Job requires AWS; resume never mentions AWS",
    resume: `Priya Natarajan
Backend Developer · priya.n@example.com

EXPERIENCE
Backend Developer — Quillfeather Books (fictional), Jan 2022 – Present
- Built REST APIs in Node.js and Express for the online bookstore.
- Deployed Node.js services to cloud virtual machines on DigitalOcean.
- Stored user-uploaded images in object storage and served them through a CDN.
- Set up nightly database backups with cron jobs.
- Wrote integration tests with Jest and Supertest.

EDUCATION
B.Sc. Software Engineering — Harborview Institute (fictional), 2021

SKILLS
Node.js, Express, JavaScript, PostgreSQL, Linux, DigitalOcean, Jest, Git`,
    jobDescription: `Cloud Backend Engineer — Tidewater Freight (fictional)

We are hiring a backend engineer to build and run services on Amazon Web Services.

Requirements
- 3+ years of hands-on AWS experience (EC2, S3, Lambda, IAM).
- Experience with infrastructure as code (CloudFormation or Terraform).
- Strong Node.js and REST API development skills.
- Experience writing automated tests.
- Bachelor's degree in a technical field.

Nice to have
- AWS Certified Developer – Associate.
- Experience with DynamoDB.`,
    trapRequirement: /\bAWS\b|Amazon Web Services|EC2|Lambda|CloudFormation/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/\bAWS\b/i, /Amazon Web Services/i, /\bEC2\b/i, /\bS3\b/i, /\bLambda\b/i, /CloudFormation/i, /Terraform/i, /CloudFront/i, /DynamoDB/i, /\bIAM\b/],
    injected: [
      {
        expected: "fabricated",
        plants: "unsupported technology (AWS EC2)",
        original: "Deployed Node.js services to cloud virtual machines on DigitalOcean.",
        suggested: "Deployed Node.js services to AWS EC2 instances and DigitalOcean cloud virtual machines.",
      },
      {
        expected: "fabricated",
        plants: "subtle unsupported technology (S3-compatible / CloudFront)",
        original: "Stored user-uploaded images in object storage and served them through a CDN.",
        suggested: "Stored user-uploaded images in S3-compatible object storage and served them through CloudFront.",
      },
      {
        expected: "control",
        original: "Deployed Node.js services to cloud virtual machines on DigitalOcean.",
        suggested: "Deployed and ran Node.js services on DigitalOcean cloud virtual machines.",
      },
      {
        expected: "fabricated",
        plants: "invented outcome (no numbers)",
        addedAfterRun1: true,
        original: "Set up nightly database backups with cron jobs.",
        suggested: "Set up nightly database backups with cron jobs, preventing data loss during production incidents.",
      },
    ],
  },
  {
    id: "B",
    title: "Job requires Python; resume contains only JavaScript",
    resume: `Marcus Ellery
Web Developer · marcus.e@example.com

EXPERIENCE
Web Developer — Greenlight Credit Union (fictional), Mar 2021 – Present
- Wrote Node.js scripts to automate CSV data cleanup for the finance team.
- Built internal reporting pages with JavaScript and Chart.js.
- Queried MySQL to produce weekly account summaries.
- Maintained the member-facing website using HTML, CSS, and JavaScript.

EDUCATION
B.A. Information Systems — Lakeshore College (fictional), 2020

SKILLS
JavaScript, Node.js, HTML, CSS, MySQL, Chart.js, Excel`,
    jobDescription: `Data Engineer — Brightwater Analytics (fictional)

Requirements
- 3+ years of professional Python development.
- Experience with pandas and NumPy for data processing.
- Experience building ETL pipelines.
- Strong SQL skills.
- Experience with Airflow or a similar workflow scheduler.

Nice to have
- Experience with Django or Flask.
- Familiarity with data visualization.`,
    trapRequirement: /Python|pandas|NumPy|Django|Flask/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/\bPython\b/i, /\bpandas\b/i, /NumPy/i, /Django/i, /Flask/i, /Airflow/i],
    injected: [
      {
        expected: "fabricated",
        plants: "unsupported skill (Python/pandas)",
        original: "Wrote Node.js scripts to automate CSV data cleanup for the finance team.",
        suggested: "Wrote Python (pandas) scripts to automate CSV data cleanup for the finance team.",
      },
      {
        expected: "fabricated",
        plants: "subtle unsupported skill (\"Node.js and Python\")",
        original: "Wrote Node.js scripts to automate CSV data cleanup for the finance team.",
        suggested: "Wrote data-processing scripts in Node.js and Python to automate CSV cleanup for the finance team.",
      },
      {
        expected: "fabricated",
        plants: "fabricated metric (70%)",
        original: "Wrote Node.js scripts to automate CSV data cleanup for the finance team.",
        suggested: "Wrote Node.js scripts that automated CSV data cleanup for the finance team, cutting manual effort by 70%.",
      },
      {
        expected: "control",
        original: "Wrote Node.js scripts to automate CSV data cleanup for the finance team.",
        suggested: "Automated CSV data cleanup for the finance team using Node.js scripts.",
      },
    ],
  },
  {
    id: "C",
    title: "Job requires 5 years of experience; candidate has 1 year",
    resume: `Dana Okafor
Frontend Developer · dana.o@example.com

SUMMARY
Frontend developer with 1 year of professional experience building React applications.

EXPERIENCE
Junior Frontend Developer — Pebblestone Travel (fictional), Aug 2025 – Present
- Built booking-flow screens in React and TypeScript.
- Fixed accessibility issues reported by the QA team.
- Wrote component tests with React Testing Library.

EDUCATION
B.Sc. Computer Science — Northgate University (fictional), 2025

SKILLS
React, TypeScript, JavaScript, CSS, React Testing Library, Git`,
    jobDescription: `Senior Frontend Developer — Harbor & Pine (fictional)

Requirements
- 5+ years of professional frontend development experience.
- Expert-level React and TypeScript.
- Experience leading frontend architecture decisions.
- Experience with automated testing.
- Degree in Computer Science or equivalent.`,
    trapRequirement: /\b5\+?\s*(\+\s*)?years|five years|senior/i,
    hallucinatedMatchLevels: ["strong"],
    forbiddenTerms: [/\b([2-9]|\d{2,})\+?\s*(\+\s*)?(years|yrs)\b/i, /\bseasoned\b/i, /\bveteran\b/i, /\bextensive\b/i, /\bsenior\b/i],
    injected: [
      {
        expected: "fabricated",
        plants: "inflated years of experience (5+)",
        original: "Frontend developer with 1 year of professional experience building React applications.",
        suggested: "Frontend developer with 5+ years of experience building React applications.",
      },
      {
        expected: "fabricated",
        plants: "inflated seniority without numbers (\"seasoned\", \"extensive\")",
        original: "Frontend developer with 1 year of professional experience building React applications.",
        suggested: "Seasoned frontend developer with extensive professional experience building React applications.",
      },
      {
        expected: "control",
        original: "Frontend developer with 1 year of professional experience building React applications.",
        suggested: "Frontend developer building React applications, with 1 year of professional experience.",
      },
      {
        expected: "fabricated",
        plants: "invented impact (\"improving conversion\")",
        addedAfterRun1: true,
        original: "Built booking-flow screens in React and TypeScript.",
        suggested: "Built booking-flow screens in React and TypeScript, improving booking conversion.",
      },
    ],
  },
  {
    id: "D",
    title: "Job requires Kubernetes and Docker; resume has neither",
    resume: `Tomasz Kowalczyk
Software Engineer · tomasz.k@example.com

EXPERIENCE
Software Engineer — Brambleway Health (fictional), Feb 2021 – Present
- Built GitHub Actions pipelines that deployed apps to a Linux VPS as systemd services.
- Wrote Bash scripts to automate server setup.
- Monitored application uptime with UptimeRobot alerts.
- Developed REST APIs in Go.

EDUCATION
B.Eng. Computer Engineering — Eastbrook Polytechnic (fictional), 2020

SKILLS
Go, Bash, Linux, GitHub Actions, Nginx, PostgreSQL`,
    jobDescription: `Platform Engineer — Cobalt Grid (fictional)

Requirements
- Production experience with Kubernetes (deployments, services, Helm charts).
- Strong Docker skills: building and optimizing container images.
- CI/CD pipeline experience.
- Linux administration.
- Proficiency in Go or Python.

Nice to have
- Experience with Prometheus and Grafana.`,
    trapRequirement: /Kubernetes|Docker|container|Helm/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/Kubernetes/i, /\bK8s\b/i, /Docker/i, /containeri[sz]/i, /\bcontainers?\b/i, /\bHelm\b/i, /Prometheus/i, /Grafana/i],
    injected: [
      {
        expected: "fabricated",
        plants: "unsupported technology (Docker)",
        original: "Built GitHub Actions pipelines that deployed apps to a Linux VPS as systemd services.",
        suggested: "Built GitHub Actions pipelines that containerized apps with Docker and deployed them to a Linux VPS.",
      },
      {
        expected: "fabricated",
        plants: "unsupported technology (Kubernetes)",
        original: "Built GitHub Actions pipelines that deployed apps to a Linux VPS as systemd services.",
        suggested: "Built GitHub Actions CI/CD pipelines that deployed apps to Kubernetes clusters.",
      },
      {
        expected: "control",
        original: "Built GitHub Actions pipelines that deployed apps to a Linux VPS as systemd services.",
        suggested: "Built GitHub Actions CI/CD pipelines that deployed apps to a Linux VPS as systemd services.",
      },
    ],
  },
  {
    id: "E",
    title: "Resume contains PostgreSQL; job asks for MongoDB",
    resume: `Lena Hartmann
Backend Developer · lena.h@example.com

EXPERIENCE
Backend Developer — Orchard Lane Payments (fictional), Jun 2020 – Present
- Designed PostgreSQL schemas and wrote SQL migrations for the billing service.
- Optimized slow SQL queries using indexes and query plans.
- Built Express APIs in TypeScript.
- Added Redis caching for session data.

EDUCATION
B.Sc. Computer Science — Riverside Technical College (fictional), 2019

SKILLS
TypeScript, Node.js, Express, PostgreSQL, SQL, Redis`,
    jobDescription: `Backend Engineer — Loomwork Studio (fictional)

Requirements
- 3+ years with MongoDB, including schema design and aggregation pipelines.
- Experience with Mongoose.
- Node.js and TypeScript.
- Experience with caching strategies.

Nice to have
- Experience with other NoSQL databases.`,
    trapRequirement: /MongoDB|Mongoose|NoSQL|aggregation/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/Mongo/i, /NoSQL/i, /Mongoose/i, /document (database|store)/i, /aggregation pipeline/i],
    injected: [
      {
        expected: "fabricated",
        plants: "unsupported technology (MongoDB)",
        original: "Designed PostgreSQL schemas and wrote SQL migrations for the billing service.",
        suggested: "Designed PostgreSQL and MongoDB schemas and wrote migrations for the billing service.",
      },
      {
        expected: "fabricated",
        plants: "subtle unsupported skill (\"relational and NoSQL\")",
        original: "Designed PostgreSQL schemas and wrote SQL migrations for the billing service.",
        suggested: "Designed relational and NoSQL database schemas and wrote migrations for the billing service.",
      },
      {
        expected: "control",
        original: "Designed PostgreSQL schemas and wrote SQL migrations for the billing service.",
        suggested: "Designed PostgreSQL database schemas and authored SQL migrations for the billing service.",
      },
      {
        expected: "fabricated",
        plants: "ownership upgrade (designed → owned), observed in run 1",
        addedAfterRun1: true,
        original: "Designed PostgreSQL schemas and wrote SQL migrations for the billing service.",
        suggested: "Owned database schema design for the billing service, modeling PostgreSQL schemas and writing SQL migrations.",
      },
    ],
  },
  {
    id: "F",
    title: "Job requires leadership experience; resume shows none",
    resume: `Sam Whitaker
Software Developer · sam.w@example.com

EXPERIENCE
Software Developer — Fernhill Logistics (fictional), Apr 2021 – Present
- Paired with a new intern during onboarding week.
- Presented the sprint demo to stakeholders.
- Implemented route-planning features in Java and Spring Boot.
- Reviewed pull requests from teammates.

EDUCATION
B.Sc. Computer Science — Westmere University (fictional), 2020

SKILLS
Java, Spring Boot, SQL, Git, Jira`,
    jobDescription: `Engineering Team Lead — Summit Parcel (fictional)

Requirements
- 3+ years leading software engineering teams.
- Experience managing direct reports, including performance reviews and hiring.
- Mentoring and developing engineers.
- Strong Java and Spring Boot background.
- Excellent stakeholder communication.`,
    trapRequirement: /lead|leading|managing|direct reports|mentor/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/\bled\b/i, /\bleads?\b/i, /\bleading\b/i, /\bmanag(ed|ing|er)\b/i, /\bmentor(ed|ing)?\b/i, /\bsupervis/i, /\bdirected\b/i, /\bheaded\b/i, /\bcoached\b/i, /\btrained\b/i],
    injected: [
      {
        expected: "fabricated",
        plants: "exaggerated responsibility (paired → mentored)",
        original: "Paired with a new intern during onboarding week.",
        suggested: "Mentored a new intern through onboarding.",
      },
      {
        expected: "fabricated",
        plants: "exaggerated responsibility (presented → led, managing)",
        original: "Presented the sprint demo to stakeholders.",
        suggested: "Led sprint demos for stakeholders, managing cross-team communication.",
      },
      {
        expected: "control",
        original: "Presented the sprint demo to stakeholders.",
        // Revised after runs 2–3: the original control ("Presented the team's sprint demo to project
        // stakeholders.") added two unsupported qualifiers, and the validator correctly rejected it.
        suggested: "Presented the sprint demo to the stakeholders.",
      },
    ],
  },
  {
    id: "G",
    title: "Job requires a certification the candidate does not have",
    resume: `Aisha Rahman
IT Support Technician · aisha.r@example.com

EXPERIENCE
IT Support Technician — Cedar Valley Clinic (fictional), Sep 2022 – Present
- Resolved help-desk tickets for staff laptops and printers.
- Configured firewall rules on the clinic router under supervision of the IT manager.
- Reset user passwords and managed Active Directory accounts.
- Completed an online course in network security fundamentals.

EDUCATION
A.A.S. Information Technology — Maplewood Community College (fictional), 2022

SKILLS
Windows, Active Directory, Networking basics, Help desk`,
    jobDescription: `Junior Security Analyst — Ironbark Insurance (fictional)

Requirements
- CompTIA Security+ certification (required).
- Experience with firewalls and network security.
- Familiarity with SIEM tools such as Splunk.
- Experience with Active Directory.

Nice to have
- CySA+ or CISSP.`,
    trapRequirement: /Security\+|CompTIA|certif|CISSP|CySA/i,
    hallucinatedMatchLevels: ["strong", "partial"],
    forbiddenTerms: [/Security\+/i, /CompTIA/i, /\bcertifi(ed|cation)\b/i, /CISSP/i, /CySA/i, /Splunk/i, /\bSIEM\b/i],
    injected: [
      {
        expected: "fabricated",
        plants: "invented certification (Security+)",
        original: "Completed an online course in network security fundamentals.",
        suggested: "CompTIA Security+ certified; completed coursework in network security fundamentals.",
      },
      {
        expected: "fabricated",
        plants: "misleading wording (\"Security+-aligned\")",
        original: "Completed an online course in network security fundamentals.",
        suggested: "Completed Security+-aligned training in network security fundamentals.",
      },
      {
        expected: "control",
        original: "Completed an online course in network security fundamentals.",
        suggested: "Completed an online course covering network security fundamentals.",
      },
    ],
  },
];
