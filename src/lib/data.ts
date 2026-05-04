import type { Subject, Chapter, Subtopic, Question } from "./types";
import {
  gravitationChapters,
  gravitationQuestions,
  gravitationSubjects,
  gravitationSubtopics,
} from "./gravitationData";

export const subjects: Subject[] = [
  {
    id: "math-11",
    name: "Mathematics",
    grade: 11,
    description: "Class 11 Mathematics — Trigonometry, Algebra, Calculus foundations",
    icon: "📐",
    isActive: true,
  },
  ...gravitationSubjects,
];

export const chapters: Chapter[] = [
  {
    id: "heights-distances",
    subjectId: "math-11",
    name: "Heights and Distances",
    description: "Application of trigonometry to find heights of towers, mountains, and distances of objects using angles of elevation and depression.",
    orderIndex: 1,
    estimatedHours: 4,
    isActive: true,
  },
  ...gravitationChapters,
];

export const subtopics: Subtopic[] = [
  {
    id: "st-1-angle-elevation-depression",
    chapterId: "heights-distances",
    name: "Angle of Elevation and Depression",
    orderIndex: 1,
    contentMarkdown: `## Angle of Elevation and Depression

### The Basics: Understanding the Setup
The foundation of Heights and Distances is standardizing how we measure viewing angles. 
- **Line of Sight:** The straight line connecting the observer's eye to the object being viewed.
- **Horizontal Line:** A perfectly level line drawn from the observer's eye, parallel to the ground.

Suppose O and P are points such that P is at a higher level than O. Let OM be the horizontal through O, meeting the vertical through P in M. Then ∠MOP is the **angle of elevation** of P as seen from O. 

If we draw PN parallel to MO (horizontal through P), then ∠NPO is the **angle of depression** of O as seen from P.

### Intermediate Concept: The Symmetry of Angles
Because the horizontal line at the observer's eye is parallel to the horizontal line at the object's position, the **Angle of Depression is mathematically equal to the Angle of Elevation** (alternate interior angles).
> *Always convert an angle of depression into an angle of elevation on your base diagram immediately to avoid drawing a right triangle "upside down".*

### Advanced: Standard Modeling Rules
- Unless stated specifically, it is assumed that the height of the observer is neglected (the observer is treated as a point on the ground).
- If the observer height *is* given (e.g., "A man 1.5m tall"), draw a rectangle representing the man and shift the entire horizontal base up by 1.5m.

### Classic JEE Pattern: Moving Objects
**Problem:** A boat is being rowed away from a cliff 150m high. At the top of the cliff, the angle of depression of the boat changes from 60° to 45° in 2 minutes. Find the speed of the boat.
**Advanced Solution Strategy:** 
1. The cliff height = 150m. Let the two positions of the boat be A (closer, 60°) and B (farther, 45°).
2. The distance to A = $150 \\cot 60^\\circ = 150/\\sqrt{3} = 50\\sqrt{3}$ m.
3. The distance to B = $150 \\cot 45^\\circ = 150(1) = 150$ m.
4. The distance traveled between A and B = $150 - 50\\sqrt{3} = 50(3 - \\sqrt{3})$ m in 2 minutes.
5. Speed = $50(3 - \\sqrt{3}) / 2$ m/min = $25(3 - \\sqrt{3})$ m/min = $1500(3 - \\sqrt{3})$ m/hour.`,
    diagramMermaid: `graph TD
    A["👁️ Observer O"] -->|"Horizontal Line OM"| B["M"]
    A -->|"Line of Sight"| C["🏢 Point P"]
    C -->|"Vertical"| B
    C -->|"Horizontal PN"| D["N"]
    style A fill:#6366f1,color:#fff
    style C fill:#10b981,color:#fff`,
    formulasLatex: [
      "\\text{tan}\\,\\theta = \\frac{\\text{Height}}{\\text{Horizontal Distance}}",
      "\\text{Angle of Depression} = \\text{Angle of Elevation}"
    ],
    keyPoints: [
      "Always measure angles from the HORIZONTAL line.",
      "Neglect observer height unless specified.",
      "Angle of elevation increases as you move towards the object."
    ],
    commonMistakes: [
      "Measuring angle of depression from the vertical wall.",
      "Forgetting to use alternate interior angles."
    ],
    difficultyLevel: 1,
    estimatedMinutes: 20,
  },
  {
    id: "st-2-directions-bearing",
    chapterId: "heights-distances",
    name: "Directions and Bearing",
    orderIndex: 2,
    contentMarkdown: `## Directions and 3D Bearings

### Basics: The Compass Plane
Sometimes it is important to understand the position of various points with reference to the four cardinal directions: **East, West, North, and South**. These directions form a 2D horizontal plane.

### Intermediate: Understanding Bearings
- **True North:** Angles are often measured clockwise from North.
- **Relative Bearing:** "6° West of North" means it is inclined to the North at an angle of 6°, measured from the North towards the West.
- **Bisecting Bearings:** North-East (NE) strictly means exactly 45° between North and East.

### Advanced Strategy: The 3D Base Diagram
JEE often tests your ability to visualize a vertical object (like a tower) standing on a 2D compass plane.
**The Golden Rule for 3D Problems:**
1. Draw the horizontal compass plane (N, S, E, W) first, completely flat on your page.
2. The vertical tower is perpendicular to *every single line* drawn on the compass plane that passes through its foot.
3. Solve the 2D geometry problem on the ground first to find the base distances, then apply 2D trigonometry to the vertical triangles.

### Classic JEE Pattern: Two-Step 3D Motion
**Problem:** A man standing 30m South of a tower of height $h$ walks 60m to the East and finds the angle of elevation of the top of the tower to be 30°. Find $h$.
**Advanced Solution Strategy:**
1. Let $T$ be the foot of the tower. Man is at $P$ (30m South of $T$).
2. Man walks 60m East to $Q$. The triangle $PTQ$ lies entirely flat on the horizontal ground.
3. Because East and South are perpendicular, $\\angle TPQ = 90^\\circ$.
4. Use Pythagoras on the ground: $TQ^2 = PT^2 + PQ^2 = 30^2 + 60^2 = 900 + 3600 = 4500$. So, $TQ = 30\\sqrt{5}$ m.
5. Now, look at the vertical right triangle formed by $T$, $Q$, and the top of the tower. Angle of elevation from $Q$ is $30^\\circ$.
6. $h = TQ \\times \\tan 30^\\circ = 30\\sqrt{5} / \\sqrt{3} = 10\\sqrt{15}$ m.`,
    diagramMermaid: `graph TD
    T["Tower Foot (Origin)"] -->|"30m South"| P["Point P"]
    P -->|"60m East"| Q["Point Q"]
    T -.->|"TQ on ground"| Q
    Q -->|"30° elevation"| Top["Tower Top"]
    style T fill:#ef4444,color:#fff
    style Top fill:#10b981,color:#fff`,
    formulasLatex: [
      "\\text{Ground Distance } d = \\sqrt{x^2 + y^2}",
      "h = d \\cdot \\tan\\theta"
    ],
    keyPoints: [
      "Draw the 2D compass base diagram first (N, S, E, W).",
      "The vertical tower is perpendicular to all lines on the horizontal plane.",
      "Use Pythagoras theorem on the ground plane to find distances to the tower's foot."
    ],
    commonMistakes: [
      "Confusing the vertical plane with the horizontal compass plane.",
      "Misinterpreting '6° West of North' as '6° North of West'."
    ],
    difficultyLevel: 2,
    estimatedMinutes: 20,
  },
  {
    id: "st-3-circle-properties",
    chapterId: "heights-distances",
    name: "Properties of Circles",
    orderIndex: 3,
    contentMarkdown: `## Circle Properties in Trigonometry

### Basics: The Intersection of Geometry and Trigonometry
Many advanced heights and distances problems involve objects viewed from multiple points that form a circle or cyclic quadrilateral on the ground. Recognizing circle properties is often the "trick" that turns a 10-minute calculation into a 30-second observation.

### Intermediate: Core Circle Theorems to Memorize
1. **Angles in the same segment:** Angles subtended by the same arc at any point on the remaining circumference are equal.
2. **Alternate Segment Theorem:** The angle between a tangent and a chord through the point of contact is equal to the angle in the alternate segment.
3. **Angle at Centre:** The angle subtended by an arc at the centre is twice the angle subtended by it at any remaining part of the circle.

### Advanced Strategy: The Equal Angle Theorem
**The Ultimate Shortcut:** If a vertical tower subtends *equal angles of elevation* at three different points $A$, $B$, and $C$ on the ground, then the foot of the tower is exactly equidistant from $A$, $B$, and $C$.
- The only point equidistant from the three vertices of a triangle is the **Circumcentre**.
- Therefore, the distance from the foot of the tower to any of the points is exactly the circumradius $R$.
- Once you realize this, the height is simply $h = R \\tan \\alpha$. You can find $R$ quickly using the Sine Rule: $R = \\frac{a}{2 \\sin A}$.`,
    formulasLatex: [
      "\\text{Foot of tower is at Circumcentre if angles are equal}",
      "\\text{Distance to points } = R",
      "h = R \\cdot \\tan\\alpha"
    ],
    keyPoints: [
      "If a vertical object subtends equal angles at multiple points on the ground, its foot is equidistant from those points.",
      "For a triangle, this equidistant point is the Circumcentre.",
      "Use sine rule a/sinA = 2R to find the circumradius if sides are known."
    ],
    commonMistakes: [
      "Assuming the foot is at the centroid or incentre when angles are equal.",
      "Forgetting the angle at centre is 2θ when angle at circumference is θ."
    ],
    difficultyLevel: 3,
    estimatedMinutes: 20,
  },
  {
    id: "st-4-important-theorems",
    chapterId: "heights-distances",
    name: "Important Theorems (Appolonius & m-n)",
    orderIndex: 4,
    contentMarkdown: `## Advanced Theorems for JEE

While most problems can be solved with basic trigonometry, JEE Advanced often tests scenarios where using pure trigonometric ratios leads to massive algebraic equations. These two geometric theorems provide massive shortcuts.

### 1. Appolonius Theorem (Median Strategy)
If you have a problem where an observer walks exactly halfway between two points to take a new measurement, you are dealing with a median.
- **Theorem:** If $AD$ is the median of the triangle $ABC$, then the sum of the squares of the two sides is equal to twice the square of the median plus twice the square of half the third side.
- **Formula:** $AB^2 + AC^2 = 2(AD^2 + BD^2)$
- **Use Case:** Finding the distance of the tower from the midpoint of a path without knowing the angles.

### 2. The $m-n$ Theorem (Base Division Strategy)
This is the single most powerful theorem for "shadow" problems or problems where a point divides a line segment in a specific ratio.

If in a triangle $ABC$, $D$ is a point on the line $BC$ such that **$BD : DC = m : n$**, and $\\angle ADC = \\theta$, $\\angle BAD = \\alpha$, $\\angle DAC = \\beta$:

**Formula 1 (When vertex angles are known):**
> $(m + n) \\cot \\theta = m \\cot \\alpha - n \\cot \\beta$

**Formula 2 (When base angles are known):**
> $(m + n) \\cot \\theta = n \\cot B - m \\cot C$

### Advanced Application
If a bird flies from point $B$ to $C$ and you observe it at ratio $m:n$ along its path, you can instantly find the angle of elevation of its path $\\theta$ without solving simultaneous equations for the heights.`,
    formulasLatex: [
      "AB^2 + AC^2 = 2(AD^2 + BD^2)",
      "(m + n)\\cot\\theta = m\\cot\\alpha - n\\cot\\beta",
      "(m + n)\\cot\\theta = n\\cot B - m\\cot C"
    ],
    keyPoints: [
      "m-n theorem is a shortcut for problems involving a point dividing the base.",
      "Use formula 1 when angles at the vertex (α, β) are given.",
      "Use formula 2 when base angles (B, C) are given."
    ],
    commonMistakes: [
      "Swapping m and n in the formula.",
      "Using the wrong sign (it is always minus on the RHS)."
    ],
    difficultyLevel: 4,
    estimatedMinutes: 25,
  },
  ...gravitationSubtopics,
];

export const subtopicNameMap: Record<string, string> = {};
subtopics.forEach((st) => {
  subtopicNameMap[st.id] = st.name;
});

export const questions: Question[] = [
  {
    id: "q1", subtopicId: "st-1-angle-elevation-depression", questionType: "mcq_single", difficulty: 2,
    questionText: "A ladder rests against a wall at an angle α to the horizontal. Its foot is pulled away from the wall through a distance 'a', so that it slides a distance 'b' down the wall making an angle β with the horizontal. Then a/b is equal to:",
    options: [
      { id: "A", text: "tan((α+β)/2)", isCorrect: true },
      { id: "B", text: "tan((α-β)/2)", isCorrect: false },
      { id: "C", text: "cot((α+β)/2)", isCorrect: false },
      { id: "D", text: "sin((α+β)/2)", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: "Let l be the length of the ladder. \nInitial state: base = l cos α, height = l sin α\nFinal state: base = l cos β, height = l sin β\nWe are given:\na = l cos β - l cos α\nb = l sin α - l sin β\nRatio a/b = (cos β - cos α) / (sin α - sin β)\nUsing C-D formulas:\na/b = [2 sin((α+β)/2) sin((α-β)/2)] / [2 cos((α+β)/2) sin((α-β)/2)]\na/b = tan((α+β)/2)",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 120, tags: ["ladder", "trig-identities"],
  },
  {
    id: "q2", subtopicId: "st-2-directions-bearing", questionType: "mcq_single", difficulty: 3,
    questionText: "Four ships A, B, C and D are at sea in the following relative positions: B is on the straight line segment AC, B is due North of D, and D is due West of C. The distance between B and D is 2 km. ∠BDA = 40°, ∠BCD = 25°. What is the distance between A and D? (Given sin 25° = 0.423)",
    options: [
      { id: "A", text: "1.812 km", isCorrect: false },
      { id: "B", text: "4.28 km", isCorrect: true },
      { id: "C", text: "3.5 km", isCorrect: false },
      { id: "D", text: "2.14 km", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: "In triangle BCD, ∠BDC = 90° (B is North of D, D is West of C). \n∠BCD = 25°. So ∠DBC = 65°.\nSince B is on AC, angle ABD = 180° - 65° = 115°.\nIn triangle ABD, ∠BDA = 40°, ∠ABD = 115°.\nTherefore, ∠DAB = 180° - (115° + 40°) = 25°.\nSince ∠DAB = 25° and ∠DCB = 25°, AD = DC.\nIn right triangle BDC, cot 25° = DC / BD.\nDC = BD cot 25° = 2 × (cos 25° / sin 25°) = 2 × (0.906 / 0.423) ≈ 4.28 km.\nThus, AD = 4.28 km.",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 180, tags: ["directions", "sine-rule"],
  },
  {
    id: "q3", subtopicId: "st-3-circle-properties", questionType: "mcq_single", difficulty: 3,
    questionText: "The angle of elevation of the top of the tower observed from each of the three points A, B, C on the ground, forming a triangle is the same angle α. If R is the circum-radius of the triangle ABC, then the height of the tower is:",
    options: [
      { id: "A", text: "R sin α", isCorrect: false },
      { id: "B", text: "R cos α", isCorrect: false },
      { id: "C", text: "R cot α", isCorrect: false },
      { id: "D", text: "R tan α", isCorrect: true },
    ],
    correctAnswer: "D",
    explanationMarkdown: "Since the tower makes equal angles of elevation at vertices A, B, and C, the foot of the tower must be equidistant from all three vertices. \nThis means the foot of the tower is at the circumcentre of triangle ABC.\nThe distance from the foot of the tower to any vertex is the circumradius R.\nIn the right triangle formed by the tower and circumradius:\ntan α = Height / R\nHeight = R tan α",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 60, tags: ["circumcentre", "equal-elevation"],
  },
  {
    id: "q4", subtopicId: "st-4-important-theorems", questionType: "mcq_single", difficulty: 4,
    questionText: "A train travelling on one of two intersecting railway lines, subtends at a certain station on the other line, an angle α when the front of the carriage reaches the junction, and an angle β when the end of the carriage reaches it. The two lines are inclined to each other at an angle θ. Which relation holds true if the length of the carriage is equal to the distance of the station from the junction?",
    options: [
      { id: "A", text: "2 cot θ = cot α - cot β", isCorrect: true },
      { id: "B", text: "cot θ = 2 cot α - cot β", isCorrect: false },
      { id: "C", text: "2 cot θ = cot α + cot β", isCorrect: false },
      { id: "D", text: "cot θ = cot α - 2 cot β", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: "By the **m-n theorem**:\nLet the station be A, junction be D, end of carriage be C, front be B. The distance AD = x, length of carriage DC = x (they are equal). \nSo m:n = 1:1.\n(m + n) cot θ = m cot α - n cot β\n(1 + 1) cot θ = 1 · cot α - 1 · cot β\n2 cot θ = cot α - cot β",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 150, tags: ["mn-theorem", "advanced"],
  },
  {
    id: "q5", subtopicId: "st-1-angle-elevation-depression", questionType: "numerical", difficulty: 2,
    questionText: "A tree is broken by wind, its upper part touches the ground at a point 10 metres from the foot of the tree and makes an angle of 45° with the ground. Find the entire length of the tree. Enter the integer part of the length assuming √2 = 1.414.",
    correctAnswer: "24",
    explanationMarkdown: "Let the broken part be hypotenuse H, standing part be P, base B = 10m. Angle = 45°.\ntan 45° = P / 10 → P = 10 m.\ncos 45° = 10 / H → 1/√2 = 10 / H → H = 10√2 m.\nTotal length = P + H = 10 + 10√2 = 10(1 + 1.414) = 10(2.414) = 24.14 m.\nThe integer part is 24.",
    positiveMarks: 4, negativeMarks: 0, timeExpectedSeconds: 90, tags: ["broken-tree", "calculation"],
  },
  {
    id: "q6", subtopicId: "st-1-angle-elevation-depression", questionType: "mcq_single", difficulty: 2,
    questionText: "An aeroplane flying at a height of 300 metres above the ground passes vertically above another plane at an instant when the angles of elevation of the two planes from the same point on the ground are 60° and 45° respectively. The height of the lower plane from the ground (in metres) is:",
    options: [
      { id: "A", text: "100√3", isCorrect: true },
      { id: "B", text: "100", isCorrect: false },
      { id: "C", text: "50", isCorrect: false },
      { id: "D", text: "150(√3+1)", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: "Let P be the top plane (300m) and Q be the lower plane. O is the observer.\nIn triangle OAP (top plane), tan 60° = 300 / OA\nOA = 300 / √3 = 100√3.\nIn triangle OAQ (lower plane), tan 45° = Height / OA\nHeight = OA × 1 = 100√3 metres.",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 120, tags: ["two-objects", "calculation"],
  },
  {
    id: "q7", subtopicId: "st-2-directions-bearing", questionType: "mcq_single", difficulty: 3,
    questionText: "A tower leans towards west making an angle α with the vertical. The angular elevation of the topmost point of the tower is β as observed from a point C due east of A at a distance d. If the angular elevation of B from a point due east of C at a distance 2d from C is γ, then 2 tan α is equal to:",
    options: [
      { id: "A", text: "3 cot β - cot γ", isCorrect: true },
      { id: "B", text: "cot β - 3 cot γ", isCorrect: false },
      { id: "C", text: "3 tan β - tan γ", isCorrect: false },
      { id: "D", text: "tan β - 3 tan γ", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: "Let L be the projection of the top B on the ground. Let LA = k, BL = h. AC = d, CD = 2d.\ntan(90°-α) = cot α = h/k → k = h cot α.\nFrom BLC: tan β = h / (k+d) → k+d = h cot β.\nFrom BLD: tan γ = h / (k+3d) → k+3d = h cot γ.\nMultiply first equation by 3 and subtract second: 3(k+d) - (k+3d) = 2k.\n2k = 3h cot β - h cot γ\nSince k = h cot α:\n2h cot α = h(3 cot β - cot γ)\n2 / tan α = 3 cot β - cot γ \nWait, the question says 'lean making angle α with vertical'. So tan α = k/h. So k = h tan α.\nHence 2h tan α = h(3 cot β - cot γ)\n2 tan α = 3 cot β - cot γ.",
    positiveMarks: 4, negativeMarks: 1, timeExpectedSeconds: 180, tags: ["leaning-tower", "advanced"],
  },
  ...gravitationQuestions,
];

export function getSubtopicsByChapter(chapterId: string): Subtopic[] {
  return subtopics.filter((st) => st.chapterId === chapterId).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function getQuestionsBySubtopic(subtopicId: string): Question[] {
  return questions.filter((q) => q.subtopicId === subtopicId);
}

export function getQuestionsByChapter(chapterId: string): Question[] {
  const chapterSubtopics = getSubtopicsByChapter(chapterId);
  const subtopicIds = new Set(chapterSubtopics.map((st) => st.id));
  return questions.filter((q) => subtopicIds.has(q.subtopicId));
}
