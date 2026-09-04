# NeuralJEE: Comprehensive Product & Architecture Specification

*This document serves as the exhaustive, single source of truth for the NeuralJEE platform. It details the product vision, the technical stack, the underlying cognitive engines, the AI ingestion pipelines, and the exact directory structures used to build a FAANG-level educational platform.*

---

## 1. Product Vision & Overview

**NeuralJEE** is an AI-powered, hyper-personalized learning platform engineered to replace traditional textbooks for the JEE exam. Rather than serving static content, the platform builds a real-time, mathematical model of the student's brain. It tracks memory decay (forgetting curves) and behavioral telemetry (time spent, option switches) to pinpoint exactly *why* a student makes an error—not just *what* error they made. 

When a student fails a complex problem, NeuralJEE doesn't just show them the solution. It diagnostically backtracks through a Knowledge Graph of 455 subtopics to find the exact prerequisite gap or cognitive flaw, and deploys a targeted AI Tutor intervention.

---

## 2. Core Technology Stack

* **Frontend & Backend Framework:** Next.js 14+ (App Router), React, TypeScript.
* **Styling:** Tailwind CSS.
* **Database:** Neon PostgreSQL with `pgvector` extension for embeddings.
* **Authentication:** Clerk (JWT-based).
* **AI Models:** 
  * **Content Generation:** Google Gemini 3.1 Pro (via Vertex AI / Python).
  * **Tutor & Evaluation:** Google Gemini 3.5 Flash Lite.
  * **Embeddings (RAG):** `Xenova/bge-base-en-v1.5` (Local ONNX model generating 768-dimensional vectors).
* **Data Processing & Pipelines:** Python 3 (asyncio, PyMuPDF, Pandas).

---

## 3. The 4-Phase Architecture Pipeline

### Phase 1: The Blueprint (Knowledge Graph)
The entire JEE syllabus is mapped into a massive Directed Acyclic Graph (DAG).
* **Schema Definition (`python/ingest/jee_syllabus.py`):** Defines 455 subtopics across Physics, Chemistry, and Math.
* **Context Mapping (`generate_prerequisites.py`):** Uses AI to generate 3,762 structural prerequisite edges (e.g., *Integration* is required for *Kinematics*).
* **Deterministic Hashing (UUIDv5):** Instead of random IDs, the system hashes the exact text path (`neuraljee://Physics/Alternating Current/...`). This perfectly syncs the Python JSON generation scripts with the PostgreSQL database without requiring a translation table, enabling seamless cross-subject dependencies.

### Phase 2: Heavy Content Generation
* **Textbook Generation (`generate_content_v2.py`):** Loops through the 455 subtopics and uses Gemini 3.1 Pro to write highly structured, 4-page progressive lessons (Foundation → Deep Concepts → Formulas → Practice). It has generated over 2,000,000 words.
* **Vision AI Extraction (`parse_pdf_questions.py`):** Extracts 43 years of Previous Year Questions (PYQs) from raw PDFs.
* **Misconception Tagging (`standardize_tags.py`):** The AI analyzes wrong options (distractors) and tags them with specific metadata:
  * `prerequisiteTrapId`: What foundation gap this option traps.
  * `misconceptionType`: The designer's intent (e.g., Formula error, Conceptual error).

### Phase 3: Database Seeding
* **Upsert Script (`seed_full_curriculum.py`):** Pushes the Graph, generated content, and PYQs into the Neon PostgreSQL database. 
* **Vectorization:** Stores 768-dimensional embeddings directly in the `subtopics` and `questions` tables for the RAG system.

### Phase 4: Next.js Backend & AI Tutor (The Runtime)
* **API Routes:** The Next.js server acts as the central brain at runtime.
* **`/api/progress`:** Manages long-term memory state.
* **`/api/quiz/evaluate`:** The diagnostic engine that analyzes student telemetry.
* **`/api/ai/remediate`:** The Socratic AI Tutor that uses RAG to teach.

---

## 4. The Digital Brain (Cognitive Engines)

NeuralJEE models the student using two mathematically rigorous engines.

### A. Long-Term Memory (FSRS Spaced Repetition)
* **Concept:** Ebbinghaus's Forgetting Curve.
* **Variables Tracked:** **Difficulty (D)**, **Stability (S)**, and **Retrievability (R)**.
* **Behavior:** Stored in the `student_mastery` table. If a student hasn't seen a topic and their Retrievability drops below 80%, the system intercepts their feed and forces a spaced review. They literally cannot forget the curriculum.

### B. Short-Term Cognitive Engine (The 2D Bayesian Classifier)
* **Location:** `src/lib/mastery/algorithm.ts`.
* **The Problem:** Older versions used hard rules. If a student rushed in 5 seconds and clicked a distractor tagged as a "Conceptual Error", the system re-taught the concept. This was wrong—the student was just careless.
* **The Solution (Two-Dimensional Diagnosis):** The engine uses a Bayesian Score Accumulator that fuses:
  1. **Engagement Gating:** (Time ratio). Fast/rushed answers decay the weight of the option tag to 0.
  2. **FSRS Memory State:** Proves if the student is suffering from retrieval decay.
  3. **Telemetry:** Option switch counts and time spent.
  
* **Output:**
  * **`surfaceTrapMode` (Metric B):** Respects the question designer's intent (e.g., The student fell for a Formula trap).
  * **`rootFailureMode` (Metric A):** The true cognitive state (e.g., `MODE_3_PROCEDURAL` - The student actually struggled with multi-step execution, not the formula itself).
* **The 7 Failure Modes:**
  1. `MODE_1_PREREQUISITE`
  2. `MODE_2_CONCEPTUAL`
  3. `MODE_3_PROCEDURAL`
  4. `MODE_4_FORMULA`
  5. `MODE_5_CARELESS`
  6. `MODE_6_GUESSING`
  7. `MODE_7_FORGETTING`

### C. Intervention Routing
Based on the `rootFailureMode`, the system maps the student to specific interventions:
* **Socratic Paradox:** For conceptual gaps.
* **Prerequisite Backtrack:** Steps down the Knowledge Graph.
* **Step-wise Skeleton:** Scaffolds procedural execution.
* **Formula Contrast Matrix:** Distinguishes similar equations.
* **Verification Check:** For careless rushers.
* **Spaced Review Card:** For memory decay.

---

## 5. The Hybrid RAG System (Retrieval-Augmented Generation)

To allow the AI Tutor to dynamically read the 2,000,000 words of content contextually, NeuralJEE uses a local RAG engine.

* **Local Embedder:** `src/lib/rag/embed.ts` uses `@xenova/transformers` to run the embedding model server-side, preventing costly third-party embedding API calls.
* **Hybrid Search Methodology:** 
  1. **Hard SQL Filter:** `WHERE 'Specific Concept' = ANY(conceptsTested)`. This ensures physics laws don't get mixed up just because the wording is similar.
  2. **Soft Vector Sort:** Sorts the strictly filtered results by cosine similarity (`ORDER BY embedding <=> vector`) to match the exact semantic context of the student's current query.

---

## 6. Directory Structure & File Mapping

```text
C:\Users\prsco\Desktop\bhagya\student\
├── python/                              # The Heavy Ingestion & Evaluation Suite
│   ├── data/                            # Raw outputs, PDFs, PYQs, JSONs
│   ├── ingest/                          # Scripts: jee_syllabus.py, generate_content.py
│   └── eval_harness/                    # The 700-call simulation engine
│       ├── run_eval.py                  # Evaluates the Bayesian Classifier
│       └── accuracy_report.json         # Evaluation metrics output
│
├── src/                                 # Next.js Application
│   ├── app/                             # App Router (Pages & API)
│   │   ├── (app)/                       # Protected user dashboard & learning UI
│   │   ├── (auth)/                      # Clerk Sign-in/Sign-up
│   │   └── api/                         # Backend endpoints
│   │       ├── ai/teach/route.ts        # RAG-powered Socratic Tutor
│   │       ├── progress/route.ts        # FSRS Memory State updates
│   │       └── quiz/evaluate/route.ts   # Connects frontend to the Bayesian engine
│   │
│   ├── components/                      # React UI Components
│   │   ├── ui/                          # Shared atomic components (Tailwind)
│   │   ├── learn/                       # RAG rendering, Markdown/MathJax display
│   │   └── quiz/                        # Quiz interfaces, options, timers
│   │
│   ├── lib/                             # Core Business Logic & Utilities
│   │   ├── db/                          # PostgreSQL connection & schemas
│   │   ├── mastery/algorithm.ts         # The 2D Cognitive Diagnostic Engine (The Brain)
│   │   ├── rag/                         # Context builders and local embedding models
│   │   └── ai/prompts/                  # System prompts for Gemini
│   │
│   └── hooks/                           # Custom React hooks (e.g. telemetry trackers)
│
├── .trae/specs/                         # Architectural decision records & planning docs
├── system_architecture.md               # Raw original blueprint
└── package.json                         # Node dependencies (Next, Tailwind, Drizzle, Xenova)
```

---

## 7. Next Steps for FAANG-Level Production

While the brain and local RAG work flawlessly, preparing for massive scale requires:
1. **Event-Driven Processing:** Moving `/api/quiz/submit` logic (mastery calculation, db updates) to an asynchronous message broker (Upstash QStash) to ensure the UI returns in <50ms.
2. **Decoupled Embedding Service:** Extracting `@xenova/transformers` from the Next.js serverless functions to a dedicated Cloud Run / ECS service. Loading a 90MB model on serverless cold-starts will blow past Vercel time limits.
3. **Semantic Caching:** Implementing Redis-based vector caching for AI doubts so that duplicate student queries don't incur Gemini API costs.
4. **JWT Enforcement:** Replacing mocked auth in the API routes with actual Clerk JWT validation to secure tenant data.
