import type { Chapter, Question, Subject, Subtopic } from "./types";

export const gravitationSubjects: Subject[] = [
  {
    id: "physics-11",
    name: "Physics",
    grade: 11,
    description: "Class 11 Physics - mechanics, gravitation, energy, fields, planets, and satellites",
    icon: "physics",
    isActive: true,
  },
];

export const gravitationChapters: Chapter[] = [
  {
    id: "gravitation",
    subjectId: "physics-11",
    name: "Gravitation",
    description:
      "Newton's law of gravitation, gravitational fields and potential, variation of g, escape speed, Kepler's laws, and satellite motion with JEE-style practice.",
    orderIndex: 1,
    estimatedHours: 10,
    isActive: true,
  },
];

export const gravitationSubtopics: Subtopic[] = [
  {
    id: "grav-newton-law-superposition",
    chapterId: "gravitation",
    name: "Newton's Law of Gravitation and Superposition",
    orderIndex: 1,
    contentMarkdown: String.raw`## Newton's Law of Gravitation and Superposition

### Part 1: The Starting Idea
Gravitation is the universal attractive interaction between masses. Every mass attracts every other mass. The force is weak for ordinary classroom objects, but it becomes dominant for planets, stars, satellites, and large astronomical systems.

For two point masses \(m_1\) and \(m_2\), separated by distance \(r\), the magnitude of the force is:

$$F=\frac{Gm_1m_2}{r^2}$$

where \(G=6.67\times 10^{-11}\ \text{N m}^2\text{kg}^{-2}\).

### Part 2: Direction Matters
The gravitational force acts along the line joining the two masses. If body A pulls body B, body B pulls body A with equal magnitude and opposite direction:

$$\vec F_{12}=-\vec F_{21}$$

This is Newton's third law in action. The force is always attractive, never repulsive.

### Part 3: Vector Form
If a source mass \(M\) is at the origin and a test mass \(m\) is at position vector \(\vec r\), then:

$$\vec F=-\frac{GMm}{r^2}\hat r=-\frac{GMm}{r^3}\vec r$$

The negative sign means the force is toward the source mass.

### Part 4: Superposition
If several masses pull on the same body, calculate each gravitational force separately and add them as vectors:

$$\vec F_{\text{net}}=\vec F_1+\vec F_2+\vec F_3+\cdots$$

This principle is essential for triangle, square, ring, shell, and multi-particle problems.

### Worked Example: Three Equal Masses on an Equilateral Triangle
Three equal masses \(M\) sit at the corners of an equilateral triangle of side \(a\). A fourth mass \(m\) is placed at the midpoint of one side.

1. The two masses at the ends of that side pull \(m\) equally in opposite directions, so those two forces cancel.
2. Only the force from the opposite vertex remains.
3. The distance from midpoint to opposite vertex is the altitude:

$$d=\frac{\sqrt 3}{2}a$$

4. Hence:

$$F=\frac{GMm}{d^2}=\frac{GMm}{(3a^2/4)}=\frac{4GMm}{3a^2}$$

### From Scratch Learning Check
If you use the AI tutor below, ask for "Part 1 only." After each part, type **yes** to continue. The tutor will keep building from force, to vectors, to multi-mass geometry.`,
    diagramMermaid: String.raw`graph LR
    A["Mass m1"] -->|"attractive force"| B["Mass m2"]
    B -->|"equal opposite force"| A
    C["Force direction"] --> D["Along line of centres"]
    E["Many source masses"] --> F["Add vectors"]
    F --> G["Net gravitational force"]`,
    flowchartMermaid: String.raw`flowchart TD
    S["Multi-body gravity question"] --> P["Mark all masses and distances"]
    P --> F["Find force due to each source mass"]
    F --> C{"Any symmetry?"}
    C -->|"Yes"| X["Cancel equal opposite components"]
    C -->|"No"| V["Resolve into x-y components"]
    X --> A["Add remaining vectors"]
    V --> A
    A --> R["Report magnitude and direction"]`,
    formulasLatex: [
      String.raw`F=\frac{Gm_1m_2}{r^2}`,
      String.raw`\vec F=-\frac{GMm}{r^2}\hat r`,
      String.raw`\vec F_{\text{net}}=\sum_i \vec F_i`,
      String.raw`G=6.67\times10^{-11}\ \text{N m}^2\text{kg}^{-2}`,
    ],
    keyPoints: [
      "Gravity is always attractive.",
      "It acts along the line joining the masses.",
      "The force is independent of the medium between the masses.",
      "For many masses, use vector addition, not ordinary scalar addition.",
    ],
    commonMistakes: [
      "Adding force magnitudes directly when directions differ.",
      "Forgetting that equal forces can cancel by symmetry.",
      "Using diameter, side, or altitude interchangeably in triangle geometry.",
    ],
    difficultyLevel: 1,
    estimatedMinutes: 35,
  },
  {
    id: "grav-field-intensity-shells",
    chapterId: "gravitation",
    name: "Gravitational Field, Intensity, Rings, Shells and Solid Spheres",
    orderIndex: 2,
    contentMarkdown: String.raw`## Gravitational Field and Intensity

### Part 1: What Is a Gravitational Field?
A gravitational field is the region around a mass where another mass experiences gravitational force. Field intensity is force per unit test mass:

$$\vec E=\frac{\vec F}{m_0}$$

For a point mass \(M\):

$$\vec E=-\frac{GM}{r^2}\hat r$$

In many physics books, gravitational intensity \(\vec E\) and acceleration due to gravity \(\vec g\) are used almost interchangeably because both have units \(\text{N kg}^{-1}=\text{m s}^{-2}\).

### Part 2: Superposition of Fields
Fields add vectorially:

$$\vec E_{\text{net}}=\vec E_1+\vec E_2+\vec E_3+\cdots$$

This is cleaner than calculating force every time because once field is known, force on any mass \(m\) is:

$$\vec F=m\vec E$$

### Part 3: Field Due to a Ring on Its Axis
For a ring of mass \(M\), radius \(R\), and a point on its axis at distance \(x\) from the center:

$$E=\frac{GMx}{(R^2+x^2)^{3/2}}$$

The sideways components cancel by symmetry. Only the axial components survive.

### Part 4: Spherical Shell Theorem
For a thin spherical shell of mass \(M\), radius \(R\):

- Outside the shell \((r>R)\), field is as if all mass were at the center:

$$E=\frac{GM}{r^2}$$

- Inside the shell \((r<R)\), field is zero:

$$E=0$$

### Part 5: Uniform Solid Sphere
For a uniform solid sphere of mass \(M\), radius \(R\):

- Outside:

$$E=\frac{GM}{r^2}$$

- Inside at distance \(r\) from center:

$$E=\frac{GMr}{R^3}$$

So field increases linearly from zero at the center to maximum at the surface, then decreases as \(1/r^2\) outside.

### Worked Example: Field Inside Earth
Assume Earth is a uniform solid sphere. At a point halfway to the center, \(r=R/2\):

$$g'=\frac{GMr}{R^3}=\frac{GM}{R^2}\frac{r}{R}=g\frac{1}{2}$$

So a body would weigh half its surface weight at halfway depth.

### From Scratch Learning Check
Ask the tutor: "Teach shell theorem from zero." Let it first explain why symmetry cancels components, then type **yes** to continue to shells and solid spheres.`,
    diagramMermaid: String.raw`graph TD
    P["Point mass"] -->|"E = GM/r^2"| F["Radial inward field"]
    R["Ring on axis"] -->|"side components cancel"| A["Axial field only"]
    S["Thin shell"] --> O["Outside acts like point mass"]
    S --> I["Inside field = 0"]
    B["Solid sphere"] --> BI["Inside field proportional to r"]
    B --> BO["Outside field proportional to 1/r^2"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Field question"] --> G{"Geometry?"}
    G -->|"Point mass"| PM["Use GM/r^2 inward"]
    G -->|"Ring axis"| RA["Use GMx/(R^2+x^2)^(3/2)"]
    G -->|"Shell"| SH{"Point inside or outside?"}
    SH -->|"Inside"| Z["E = 0"]
    SH -->|"Outside"| PS["Treat shell as point mass"]
    G -->|"Solid sphere"| SS{"r < R?"}
    SS -->|"Yes"| LIN["E = GMr/R^3"]
    SS -->|"No"| EXT["E = GM/r^2"]`,
    formulasLatex: [
      String.raw`\vec E=\frac{\vec F}{m_0}`,
      String.raw`E_{\text{point}}=\frac{GM}{r^2}`,
      String.raw`E_{\text{ring axis}}=\frac{GMx}{(R^2+x^2)^{3/2}}`,
      String.raw`E_{\text{shell inside}}=0`,
      String.raw`E_{\text{solid inside}}=\frac{GMr}{R^3}`,
    ],
    keyPoints: [
      "Gravitational field is a vector.",
      "Inside a spherical shell, gravitational field is zero everywhere.",
      "Outside a spherical shell or uniform solid sphere, treat the mass as concentrated at the center.",
      "Inside a uniform solid sphere, only the mass enclosed within radius r contributes.",
    ],
    commonMistakes: [
      "Using shell inside field as GM/r^2. It is zero.",
      "Forgetting that ring field at the center is zero because x = 0.",
      "Applying the inside-solid-sphere formula outside the sphere.",
    ],
    difficultyLevel: 3,
    estimatedMinutes: 50,
  },
  {
    id: "grav-variation-g",
    chapterId: "gravitation",
    name: "Variation of Acceleration Due to Gravity",
    orderIndex: 3,
    contentMarkdown: String.raw`## Variation of Acceleration Due to Gravity

### Part 1: Surface Value
At Earth's surface:

$$g=\frac{GM}{R^2}$$

where \(M\) is Earth's mass and \(R\) is Earth's radius.

### Part 2: Variation With Height
At height \(h\) above the surface:

$$g_h=\frac{GM}{(R+h)^2}=g\left(\frac{R}{R+h}\right)^2$$

If \(h\ll R\), use the approximation:

$$g_h\approx g\left(1-\frac{2h}{R}\right)$$

### Part 3: Variation With Depth
At depth \(d\), distance from center is \(R-d\). For uniform Earth:

$$g_d=g\left(1-\frac{d}{R}\right)$$

At the center \((d=R)\), \(g_d=0\).

### Part 4: Variation Due to Earth's Rotation
Earth's rotation reduces apparent gravity because part of gravity supplies centripetal acceleration.

At latitude \(\lambda\):

$$g_{\text{effective}}=g-\omega^2R\cos^2\lambda$$

At poles, \(\cos 90^\circ=0\), so no reduction. At equator, reduction is maximum.

### Part 5: Weightlessness at the Equator
At the equator, apparent gravity becomes zero when:

$$g-\omega^2R=0$$

Using \(\omega=2\pi/T\):

$$T=2\pi\sqrt{\frac{R}{g}}$$

This gives about 84 minutes, much shorter than a normal day.

### Worked Example: Same Change Above and Below the Surface
If the decrease in \(g\) at height \(h\) equals the decrease at depth \(x\), for small \(h\):

Height decrease:

$$\Delta g_h=g-g_h\approx \frac{2gh}{R}$$

Depth decrease:

$$\Delta g_x=g-g_x=\frac{gx}{R}$$

Set them equal:

$$\frac{2gh}{R}=\frac{gx}{R}\Rightarrow x=2h$$

### From Scratch Learning Check
Ask the tutor to teach this in three parts: surface formula, height/depth comparison, and rotation. Type **yes** after each.`,
    diagramMermaid: String.raw`graph TD
    S["Surface: g = GM/R^2"] --> H["Height h: g decreases as 1/(R+h)^2"]
    S --> D["Depth d: g decreases linearly"]
    S --> ROT["Rotation reduces apparent g"]
    ROT --> EQ["Maximum reduction at equator"]
    ROT --> PO["No rotational reduction at poles"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Variation of g problem"] --> A{"Location?"}
    A -->|"Height h"| H{"h much smaller than R?"}
    H -->|"Yes"| HA["Use g(1 - 2h/R)"]
    H -->|"No"| HE["Use gR^2/(R+h)^2"]
    A -->|"Depth d"| D["Use g(1 - d/R)"]
    A -->|"Latitude"| L["Use g - omega^2 R cos^2(lambda)"]
    A -->|"Center"| C["g = 0"]`,
    formulasLatex: [
      String.raw`g=\frac{GM}{R^2}`,
      String.raw`g_h=g\left(\frac{R}{R+h}\right)^2`,
      String.raw`g_h\approx g\left(1-\frac{2h}{R}\right)\quad(h\ll R)`,
      String.raw`g_d=g\left(1-\frac{d}{R}\right)`,
      String.raw`g_{\text{effective}}=g-\omega^2R\cos^2\lambda`,
    ],
    keyPoints: [
      "Gravity decreases with height above the surface.",
      "For small height h, fractional decrease is about 2h/R.",
      "For depth d, fractional decrease is d/R.",
      "Apparent gravity is maximum at poles and minimum at equator.",
    ],
    commonMistakes: [
      "Using the small-height approximation when h is comparable to R.",
      "Forgetting the factor 2 in the height approximation.",
      "Using cos(lambda) instead of cos squared lambda for latitude correction.",
    ],
    difficultyLevel: 2,
    estimatedMinutes: 45,
  },
  {
    id: "grav-potential-energy",
    chapterId: "gravitation",
    name: "Gravitational Potential and Potential Energy",
    orderIndex: 4,
    contentMarkdown: String.raw`## Gravitational Potential and Potential Energy

### Part 1: Why Potential Energy Is Negative
We usually define gravitational potential energy as zero at infinite separation. Since gravity is attractive, two masses closer together form a bound system with negative potential energy:

$$U=-\frac{Gm_1m_2}{r}$$

Negative energy does not mean "less than nothing" physically. It means you must supply positive energy to separate the masses to infinity.

### Part 2: Gravitational Potential
Gravitational potential is potential energy per unit test mass:

$$V=\frac{U}{m}$$

For point mass \(M\):

$$V=-\frac{GM}{r}$$

Potential is a scalar, so potentials add algebraically:

$$V_{\text{net}}=V_1+V_2+V_3+\cdots$$

### Part 3: Field and Potential Relation
Field is the negative gradient of potential:

$$\vec E=-\nabla V$$

In one dimension:

$$E_x=-\frac{dV}{dx}$$

If potential decreases in a direction, field points that way.

### Part 4: Shell and Solid Sphere Potential
For a thin shell of mass \(M\), radius \(R\):

- Outside:

$$V=-\frac{GM}{r}$$

- On surface and everywhere inside:

$$V=-\frac{GM}{R}$$

For a uniform solid sphere:

- Outside:

$$V=-\frac{GM}{r}$$

- Inside:

$$V=-\frac{GM}{2R^3}(3R^2-r^2)$$

### Part 5: Multi-Particle Potential Energy
For a system of many particles, add pairwise potential energies:

$$U_{\text{system}}=-G\sum_{\text{pairs}}\frac{m_im_j}{r_{ij}}$$

### Worked Example: Two Masses Released From Rest
Two masses \(2M\) and \(M\) start far apart and move toward each other. Momentum conservation gives:

$$2M v_1=M v_2\Rightarrow v_2=2v_1$$

Then use conservation of mechanical energy. The lost gravitational potential energy becomes kinetic energy of both bodies.

### From Scratch Learning Check
The AI tutor can teach this slowly: first negative energy, then scalar potential, then shell/sphere formulas. Type **yes** after each part.`,
    diagramMermaid: String.raw`graph TD
    I["Infinity reference"] --> Z["U = 0"]
    C["Masses closer together"] --> N["U is negative"]
    N --> B["Bound system"]
    B --> E["Need positive energy to separate"]
    V["Potential V"] --> S["Scalar: add directly"]
    F["Field E"] --> G["Vector: add by components"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Potential / energy question"] --> A{"Asked for V or U?"}
    A -->|"Potential V"| V["Use -GM/r and add scalars"]
    A -->|"Potential energy U"| U["Use -Gm1m2/r for each pair"]
    V --> G{"Field needed?"}
    G -->|"Yes"| D["Use E = -dV/dr"]
    G -->|"No"| R["Finish scalar result"]
    U --> M{"Motion involved?"}
    M -->|"Yes"| C["Use conservation of energy and momentum"]
    M -->|"No"| P["Add pair energies"]`,
    formulasLatex: [
      String.raw`U=-\frac{Gm_1m_2}{r}`,
      String.raw`V=-\frac{GM}{r}`,
      String.raw`\vec E=-\nabla V`,
      String.raw`V_{\text{shell inside}}=-\frac{GM}{R}`,
      String.raw`V_{\text{solid inside}}=-\frac{GM}{2R^3}(3R^2-r^2)`,
    ],
    keyPoints: [
      "Potential is scalar; field is vector.",
      "Potential energy is negative when zero is chosen at infinity.",
      "Inside a shell, potential is constant but field is zero.",
      "For systems, add potential energy for every distinct pair.",
    ],
    commonMistakes: [
      "Thinking zero field means zero potential. Inside a shell, field is zero but potential is nonzero.",
      "Forgetting the negative sign in gravitational potential energy.",
      "Counting each pair twice in system potential energy.",
    ],
    difficultyLevel: 3,
    estimatedMinutes: 55,
  },
  {
    id: "grav-binding-escape",
    chapterId: "gravitation",
    name: "Binding Energy and Escape Velocity",
    orderIndex: 5,
    contentMarkdown: String.raw`## Binding Energy and Escape Velocity

### Part 1: Binding Energy
Binding energy is the minimum energy required to separate a bound gravitational system to infinity.

For two masses:

$$U=-\frac{Gm_1m_2}{r}$$

So the binding energy magnitude is:

$$B=\frac{Gm_1m_2}{r}$$

### Part 2: Escape Velocity From a Planet
Escape velocity is the minimum launch speed needed for a body to reach infinity with zero final speed.

At surface:

$$\frac12mv_e^2-\frac{GMm}{R}=0$$

So:

$$v_e=\sqrt{\frac{2GM}{R}}=\sqrt{2gR}$$

It does not depend on the mass of the launched body.

### Part 3: Escape Speed From Height
At distance \(r\) from the planet center:

$$v_e(r)=\sqrt{\frac{2GM}{r}}$$

At height \(h\):

$$v_e=\sqrt{\frac{2GM}{R+h}}$$

### Part 4: Projection Direction
In the simplest no-atmosphere, no-collision model, escape speed depends on total mechanical energy, not on direction. Direction affects path, but not the minimum speed.

### Part 5: Atmosphere and Escape
A planet can hold an atmosphere only if typical molecular speeds are much smaller than escape speed. Lighter gas molecules move faster at the same temperature and escape more easily.

### Worked Example: Jupiter vs Earth
If \(M_J=318M_E\), \(R_J=11.2R_E\), and Earth's escape speed is \(11.2\ \text{km/s}\), then:

$$\frac{v_J}{v_E}=\sqrt{\frac{M_J/R_J}{M_E/R_E}}=\sqrt{\frac{318}{11.2}}$$

$$v_J\approx 11.2\sqrt{28.4}\approx 59.7\ \text{km/s}$$

### From Scratch Learning Check
Ask the AI tutor for one part at a time: binding energy first, surface escape speed second, height and direction third. Type **yes** to proceed.`,
    diagramMermaid: String.raw`graph TD
    B["Bound system: E < 0"] --> BE["Binding energy needed"]
    LA["Launch from surface"] --> KE["Kinetic energy"]
    KE --> INF["At infinity: U = 0, K = 0 for minimum escape"]
    INF --> VE["v_e = sqrt(2GM/R)"]
    H["Higher altitude"] --> LOW["Lower escape speed"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Escape / binding problem"] --> A{"What is asked?"}
    A -->|"Binding energy"| B["Take magnitude of negative total energy"]
    A -->|"Escape speed"| E["Set final total energy at infinity to zero"]
    E --> R{"Launch distance from center?"}
    R -->|"R"| S["v_e = sqrt(2GM/R)"]
    R -->|"R+h"| H["v_e = sqrt(2GM/(R+h))"]
    A -->|"Atmosphere"| M["Compare molecular speed with escape speed"]`,
    formulasLatex: [
      String.raw`B=\frac{Gm_1m_2}{r}`,
      String.raw`v_e=\sqrt{\frac{2GM}{R}}`,
      String.raw`v_e=\sqrt{2gR}`,
      String.raw`v_e(r)=\sqrt{\frac{2GM}{r}}`,
      String.raw`E_{\text{escape,min}}=0`,
    ],
    keyPoints: [
      "Escape speed is independent of the projectile mass.",
      "Escape speed decreases as launch altitude increases.",
      "Minimum escape means reaching infinity with zero speed.",
      "A negative total energy means the object is gravitationally bound.",
    ],
    commonMistakes: [
      "Using orbital speed instead of escape speed.",
      "Adding mass of projectile into the final escape speed formula.",
      "Thinking escape speed changes with launch angle in the ideal model.",
    ],
    difficultyLevel: 3,
    estimatedMinutes: 45,
  },
  {
    id: "grav-kepler-planets",
    chapterId: "gravitation",
    name: "Motion of Planets and Kepler's Laws",
    orderIndex: 6,
    contentMarkdown: String.raw`## Motion of Planets and Kepler's Laws

### Part 1: Kepler's Three Laws
Kepler summarized planetary motion:

1. Planets move in elliptical orbits with the sun at one focus.
2. The line joining the sun and planet sweeps equal areas in equal times.
3. The square of the time period is proportional to the cube of the semi-major axis.

$$T^2\propto a^3$$

For a circular orbit, \(a=r\).

### Part 2: Circular Orbit From Newton's Law
For a planet of mass \(m\) moving around a much heavier sun of mass \(M\):

$$\frac{GMm}{r^2}=\frac{mv^2}{r}$$

So:

$$v=\sqrt{\frac{GM}{r}}$$

### Part 3: Time Period
Since \(T=2\pi r/v\):

$$T=2\pi\sqrt{\frac{r^3}{GM}}$$

Squaring:

$$T^2=\frac{4\pi^2}{GM}r^3$$

This is Kepler's third law for circular orbits.

### Part 4: Kepler's Second Law and Angular Momentum
Gravity acts along the radius, so torque about the sun is zero:

$$\vec \tau=\vec r\times \vec F=0$$

Therefore angular momentum is conserved.

Areal velocity is:

$$\frac{dA}{dt}=\frac{L}{2m}$$

Since \(L\) is constant, equal areas are swept in equal times. A planet moves fastest near perihelion and slowest near aphelion.

### Worked Example: Saturn's Distance
If Saturn's period is \(29.5\) Earth years and Earth's orbital radius is \(1.5\times10^8\ \text{km}\):

$$\frac{T_S^2}{T_E^2}=\frac{R_S^3}{R_E^3}$$

$$R_S=R_E(29.5)^{2/3}\approx1.43\times10^9\ \text{km}$$

### From Scratch Learning Check
Ask the tutor for Kepler's laws in tiny steps: law 1 picture, law 2 angular momentum, law 3 formula. Type **yes** after each part.`,
    diagramMermaid: String.raw`graph TD
    K1["Kepler 1: elliptical orbit"] --> F["Sun at one focus"]
    K2["Kepler 2: equal areas"] --> L["Angular momentum conserved"]
    K3["Kepler 3: T^2 proportional to a^3"] --> N["From gravity = centripetal force"]
    P["Perihelion"] --> FAST["Speed maximum"]
    A["Aphelion"] --> SLOW["Speed minimum"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Planetary motion problem"] --> C{"Circular or elliptical?"}
    C -->|"Circular"| V["Use GMm/r^2 = mv^2/r"]
    V --> T["Find v, omega, or T"]
    C -->|"Elliptical"| E["Use conservation of angular momentum and energy"]
    E --> A["At perihelion/aphelion: mvr conserved"]
    A --> R["Use total energy at two positions"]
    Q --> K{"Comparing planets?"}
    K -->|"Yes"| K3["Use T1^2/T2^2 = a1^3/a2^3"]`,
    formulasLatex: [
      String.raw`v=\sqrt{\frac{GM}{r}}`,
      String.raw`T=2\pi\sqrt{\frac{r^3}{GM}}`,
      String.raw`T^2=\frac{4\pi^2}{GM}r^3`,
      String.raw`\frac{dA}{dt}=\frac{L}{2m}`,
      String.raw`m v_{\text{near}} r_{\text{near}}=m v_{\text{far}} r_{\text{far}}`,
    ],
    keyPoints: [
      "Kepler's second law is conservation of angular momentum.",
      "For the same central mass, larger orbit means longer period.",
      "Planets move faster when closer to the sun.",
      "Kepler's third law uses semi-major axis for elliptical orbits.",
    ],
    commonMistakes: [
      "Using radius instead of semi-major axis in elliptical orbit comparisons.",
      "Assuming speed is constant in an ellipse.",
      "Forgetting that the proportionality constant depends on the central mass.",
    ],
    difficultyLevel: 3,
    estimatedMinutes: 50,
  },
  {
    id: "grav-satellites-energy",
    chapterId: "gravitation",
    name: "Satellites: Speed, Period, Energy and Geostationary Orbit",
    orderIndex: 7,
    contentMarkdown: String.raw`## Satellites: Speed, Period, Energy and Geostationary Orbit

### Part 1: Orbital Speed
For a satellite in circular orbit of radius \(r=R+h\):

$$\frac{GMm}{r^2}=\frac{mv^2}{r}$$

So:

$$v=\sqrt{\frac{GM}{r}}=\sqrt{\frac{GM}{R+h}}$$

Near Earth's surface:

$$v\approx \sqrt{gR}$$

### Part 2: Angular Speed and Period

$$\omega=\frac{v}{r}=\sqrt{\frac{GM}{r^3}}$$

$$T=2\pi\sqrt{\frac{r^3}{GM}}$$

As orbit radius increases, period increases.

### Part 3: Energy of a Circular Orbit
Potential energy:

$$U=-\frac{GMm}{r}$$

Kinetic energy:

$$K=\frac12mv^2=\frac{GMm}{2r}$$

Total energy:

$$E=K+U=-\frac{GMm}{2r}$$

So:

$$K=|E|,\qquad U=-2K,\qquad E=\frac{U}{2}$$

### Part 4: Shifting Orbits
To raise a satellite from radius \(r_1\) to \(r_2\), minimum energy added equals the increase in total mechanical energy:

$$\Delta E=\left(-\frac{GMm}{2r_2}\right)-\left(-\frac{GMm}{2r_1}\right)$$

### Part 5: Geostationary Satellite
A geostationary satellite:

- has period 24 hours,
- moves in the same sense as Earth's rotation,
- lies in the equatorial plane,
- appears fixed above one point on Earth.

### Worked Example: Same Radius, Different Satellite Masses
Two satellites at the same orbital radius have the same speed and period, even if their masses differ. This happens because \(m\) cancels out in:

$$\frac{GMm}{r^2}=\frac{mv^2}{r}$$

But the heavier satellite has greater kinetic energy because \(K=\frac12mv^2\).

### From Scratch Learning Check
Ask the tutor to teach satellite motion in four pauses: speed, period, energy, geostationary conditions. Type **yes** to continue each time.`,
    diagramMermaid: String.raw`graph TD
    O["Circular orbit radius r"] --> V["Orbital speed sqrt(GM/r)"]
    O --> T["Period 2pi sqrt(r^3/GM)"]
    O --> E["Total energy -GMm/(2r)"]
    E --> K["K = +GMm/(2r)"]
    E --> U["U = -GMm/r"]
    GEO["Geostationary"] --> P24["T = 24 hours"]
    GEO --> EQ["Equatorial orbit"]
    GEO --> SAME["Same direction as Earth rotation"]`,
    flowchartMermaid: String.raw`flowchart TD
    Q["Satellite question"] --> A{"Asked quantity?"}
    A -->|"Speed"| V["v = sqrt(GM/r)"]
    A -->|"Period"| T["T = 2pi sqrt(r^3/GM)"]
    A -->|"Energy"| E["Use K, U, E relations"]
    A -->|"Orbit shift"| D["Delta E = E2 - E1"]
    A -->|"Geostationary"| G["Set T = 24 h and equatorial same-sense orbit"]
    E --> R["Remember U = -2K and E = -K"]`,
    formulasLatex: [
      String.raw`v=\sqrt{\frac{GM}{r}}`,
      String.raw`\omega=\sqrt{\frac{GM}{r^3}}`,
      String.raw`T=2\pi\sqrt{\frac{r^3}{GM}}`,
      String.raw`K=\frac{GMm}{2r}`,
      String.raw`U=-\frac{GMm}{r}`,
      String.raw`E=-\frac{GMm}{2r}`,
    ],
    keyPoints: [
      "Orbital speed does not depend on satellite mass.",
      "Total energy of a bound circular satellite is negative.",
      "Raising a satellite increases its total energy but decreases its speed.",
      "Geostationary orbit must be equatorial and have a 24-hour period.",
    ],
    commonMistakes: [
      "Thinking the centripetal force is extra in addition to gravity. Gravity is the centripetal force.",
      "Using escape speed for orbital speed.",
      "Saying all 24-hour satellites are geostationary without checking plane and direction.",
    ],
    difficultyLevel: 3,
    estimatedMinutes: 55,
  },
  {
    id: "grav-jee-mixed-practice",
    chapterId: "gravitation",
    name: "JEE Mixed Practice Patterns",
    orderIndex: 8,
    contentMarkdown: String.raw`## JEE Mixed Practice Patterns

### Pattern 1: Symmetry and Superposition
When a cavity is scooped from a sphere, treat the final body as:

$$\text{full sphere} - \text{removed sphere}$$

Then add fields or potentials using superposition. This turns a complicated mass distribution into two standard systems.

### Pattern 2: Inside vs Outside Formula Selection
For shells and spheres, most traps come from choosing the wrong region:

- shell inside: \(E=0\), \(V\) constant;
- solid sphere inside: \(E\propto r\);
- outside either: treat as point mass.

### Pattern 3: Energy in Launch and Orbit Problems
Use conservation of mechanical energy whenever height, speed, escape, fall, or orbit transfer appears.

For circular orbit:

$$E=-\frac{GMm}{2r}$$

For escape threshold:

$$E=0$$

### Pattern 4: Angular Momentum in Elliptical Orbits
At closest and farthest points in an elliptical orbit, velocity is tangential. Use:

$$m v_{\min} r_{\max}=m v_{\max} r_{\min}$$

Then combine with energy conservation.

### Pattern 5: Graphs
Common JEE graph expectations:

- \(g\) vs distance from Earth's center: linear inside, inverse-square outside.
- \(V\) for shell: constant inside, \(-GM/r\) outside.
- \(E\) for shell: zero inside, jumps at the surface if shell is idealized.
- \(V\) is continuous across a shell surface, but \(E\) can be discontinuous.

### Pattern 6: Units and Dimensions
From \(F=Gm_1m_2/r^2\):

$$[G]=M^{-1}L^3T^{-2}$$

### How to Use This Practice Section
1. Read the question and identify whether it is force, field, potential, energy, or orbit.
2. Pick the correct base formula.
3. Check the region: inside, surface, outside, height, or depth.
4. Use symmetry before algebra.
5. For motion, try conservation laws before force equations.

### From Scratch Learning Check
Ask the tutor to take any question you missed and teach only the first decision step. Once that is clear, type **yes** to continue to formula choice and solution.`,
    diagramMermaid: String.raw`graph TD
    Q["JEE gravitation question"] --> TYPE["Classify"]
    TYPE --> F["Force/field"]
    TYPE --> V["Potential"]
    TYPE --> E["Energy"]
    TYPE --> O["Orbit"]
    F --> SYM["Use symmetry/superposition"]
    V --> SCALAR["Add scalars"]
    E --> CONS["Conserve mechanical energy"]
    O --> AM["Use centripetal force or angular momentum"]`,
    flowchartMermaid: String.raw`flowchart TD
    S["Start practice problem"] --> K["Underline given quantities"]
    K --> C{"Concept family?"}
    C -->|"Field"| RF["Region check: inside/outside"]
    C -->|"Potential"| SC["Scalar addition"]
    C -->|"Energy"| EN["Initial E = final E"]
    C -->|"Satellite"| OR["Use circular orbit relations"]
    C -->|"Ellipse"| EL["Use angular momentum + energy"]
    RF --> A["Apply formula carefully"]
    SC --> A
    EN --> A
    OR --> A
    EL --> A
    A --> U["Check units and limiting case"]`,
    formulasLatex: [
      String.raw`[G]=M^{-1}L^3T^{-2}`,
      String.raw`E_{\text{shell inside}}=0`,
      String.raw`E_{\text{solid inside}}\propto r`,
      String.raw`E_{\text{orbit}}=-\frac{GMm}{2r}`,
      String.raw`E_{\text{escape}}=0`,
    ],
    keyPoints: [
      "Most difficult problems become standard after classification.",
      "Superposition is the main trick for cavities and multiple masses.",
      "Potential is scalar; field and force are vectors.",
      "Graph questions often test continuity of potential versus discontinuity of field.",
    ],
    commonMistakes: [
      "Starting algebra before identifying the concept family.",
      "Forgetting to subtract the removed mass in cavity problems.",
      "Assuming potential and field have the same graph behavior.",
    ],
    difficultyLevel: 4,
    estimatedMinutes: 60,
  },
];

export const gravitationQuestions: Question[] = [
  {
    id: "grav-q1-force-law-dimensions",
    subtopicId: "grav-newton-law-superposition",
    questionType: "mcq_single",
    difficulty: 1,
    questionText: "The dimensional formula of the universal gravitational constant $G$ is:",
    options: [
      { id: "A", text: "$M^{-1}L^3T^{-2}$", isCorrect: true },
      { id: "B", text: "$ML^{-3}T^{-2}$", isCorrect: false },
      { id: "C", text: "$M^{-1}L^2T^{-1}$", isCorrect: false },
      { id: "D", text: "$ML^3T^{-2}$", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`From $F=\frac{Gm_1m_2}{r^2}$, we get $G=\frac{Fr^2}{m_1m_2}$. Since $[F]=MLT^{-2}$, $[G]=\frac{MLT^{-2}\cdot L^2}{M^2}=M^{-1}L^3T^{-2}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 60,
    tags: ["dimensions", "newton-law"],
  },
  {
    id: "grav-q2-triangle-midpoint",
    subtopicId: "grav-newton-law-superposition",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "Three equal masses $M$ are placed at the vertices of an equilateral triangle of side $a$. A mass $m$ is kept at the midpoint of one side. The net force on $m$ is:",
    options: [
      { id: "A", text: "$\\frac{GMm}{a^2}$", isCorrect: false },
      { id: "B", text: "$\\frac{2GMm}{a^2}$", isCorrect: false },
      { id: "C", text: "$\\frac{4GMm}{3a^2}$", isCorrect: true },
      { id: "D", text: "zero", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`The two endpoint masses of that side pull equally in opposite directions, so they cancel. Only the opposite vertex contributes. Its distance from the midpoint is $a\sqrt3/2$, so $F=\frac{GMm}{(a\sqrt3/2)^2}=\frac{4GMm}{3a^2}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 120,
    tags: ["superposition", "symmetry", "triangle"],
  },
  {
    id: "grav-q3-four-particles-circle",
    subtopicId: "grav-newton-law-superposition",
    questionType: "mcq_single",
    difficulty: 4,
    questionText:
      "Four equal masses $M$ move on a circle of radius $R$ under their mutual gravitational attraction, occupying the corners of a square. The speed of each mass is proportional to:",
    options: [
      { id: "A", text: "$\\sqrt{\\frac{GM}{R}}$", isCorrect: true },
      { id: "B", text: "$\\sqrt{GMR}$", isCorrect: false },
      { id: "C", text: "$\\frac{GM}{R}$", isCorrect: false },
      { id: "D", text: "$\\sqrt{\\frac{GR}{M}}$", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`The net inward gravitational force is a constant numerical factor times $GM^2/R^2$. Setting this equal to $Mv^2/R$ gives $v^2\propto GM/R$, so $v\propto \sqrt{GM/R}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 150,
    tags: ["multi-particle", "circular-motion"],
  },
  {
    id: "grav-q4-field-shell-inside",
    subtopicId: "grav-field-intensity-shells",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "The gravitational field at any point inside a uniform thin spherical shell is:",
    options: [
      { id: "A", text: "$\\frac{GM}{R^2}$", isCorrect: false },
      { id: "B", text: "$\\frac{GM}{r^2}$", isCorrect: false },
      { id: "C", text: "zero", isCorrect: true },
      { id: "D", text: "$\\frac{GMr}{R^3}$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`By the shell theorem, all gravitational pulls from the shell cancel at any interior point. Therefore the field inside a uniform spherical shell is zero.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 60,
    tags: ["shell-theorem", "field"],
  },
  {
    id: "grav-q5-solid-sphere-halfway",
    subtopicId: "grav-field-intensity-shells",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "Assuming Earth is a uniform solid sphere, a body weighs $250\\,\\text{N}$ at the surface. Its weight halfway down to the center is:",
    options: [
      { id: "A", text: "$250\\,\\text{N}$", isCorrect: false },
      { id: "B", text: "$125\\,\\text{N}$", isCorrect: true },
      { id: "C", text: "$62.5\\,\\text{N}$", isCorrect: false },
      { id: "D", text: "zero", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Inside a uniform solid sphere, $g'\propto r$. Halfway to the center means $r=R/2$, so $g'=g/2$. The weight becomes $250/2=125\\,\\text{N}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["solid-sphere", "inside-earth"],
  },
  {
    id: "grav-q6-ring-axis-center",
    subtopicId: "grav-field-intensity-shells",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "For a uniform ring, the gravitational field on its axis at the center of the ring is:",
    options: [
      { id: "A", text: "maximum", isCorrect: false },
      { id: "B", text: "$GM/R^2$", isCorrect: false },
      { id: "C", text: "zero", isCorrect: true },
      { id: "D", text: "$GM/R$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`For a ring, $E=\frac{GMx}{(R^2+x^2)^{3/2}}$. At the center, $x=0$, so $E=0$. Symmetrically, pulls from opposite elements cancel.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["ring", "field", "symmetry"],
  },
  {
    id: "grav-q7-height-depth-same-change",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "If the change in $g$ at height $h$ above Earth's surface is the same as at depth $x$ below it, with $h,x\\ll R$, then:",
    options: [
      { id: "A", text: "$x=h$", isCorrect: false },
      { id: "B", text: "$x=2h$", isCorrect: true },
      { id: "C", text: "$x=h/2$", isCorrect: false },
      { id: "D", text: "$x=4h$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`For small height, $g_h\approx g(1-2h/R)$, so decrease is $2gh/R$. At depth $x$, $g_x=g(1-x/R)$, so decrease is $gx/R$. Equating gives $x=2h$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 100,
    tags: ["variation-g", "height-depth"],
  },
  {
    id: "grav-q8-center-earth-weight",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 1,
    questionText: "The weight of a body at the center of Earth, assuming Earth is spherical and uniform, is:",
    options: [
      { id: "A", text: "zero", isCorrect: true },
      { id: "B", text: "infinite", isCorrect: false },
      { id: "C", text: "same as surface weight", isCorrect: false },
      { id: "D", text: "twice surface weight", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`Inside a uniform solid sphere, $g'=g(r/R)$. At the center $r=0$, so $g'=0$ and weight $mg'$ is zero.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 60,
    tags: ["center-earth", "weight"],
  },
  {
    id: "grav-q9-weightless-equator-period",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "The approximate period of Earth's rotation needed to make objects weightless at the equator is closest to:",
    options: [
      { id: "A", text: "84 min", isCorrect: true },
      { id: "B", text: "12 h", isCorrect: false },
      { id: "C", text: "24 h", isCorrect: false },
      { id: "D", text: "7 days", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`At the equator, weightlessness requires $g-\omega^2R=0$. Thus $\omega=\sqrt{g/R}$ and $T=2\pi\sqrt{R/g}$, which is about $84$ minutes for Earth.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 120,
    tags: ["rotation", "weightlessness"],
  },
  {
    id: "grav-q10-potential-shell-inside",
    subtopicId: "grav-potential-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "Inside a uniform spherical shell, gravitational potential is:",
    options: [
      { id: "A", text: "zero everywhere", isCorrect: false },
      { id: "B", text: "constant and equal to $-GM/R$", isCorrect: true },
      { id: "C", text: "proportional to $r$", isCorrect: false },
      { id: "D", text: "proportional to $1/r^2$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Inside a shell, field is zero, so potential does not change with position. It equals its surface value, $V=-GM/R$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["potential", "shell"],
  },
  {
    id: "grav-q11-potential-zero-field",
    subtopicId: "grav-potential-energy",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "A point lies inside a uniform spherical shell. Which statement is correct?",
    options: [
      { id: "A", text: "Both field and potential are zero.", isCorrect: false },
      { id: "B", text: "Field is zero, but potential is constant and nonzero.", isCorrect: true },
      { id: "C", text: "Potential is zero, but field is nonzero.", isCorrect: false },
      { id: "D", text: "Both field and potential vary with distance from center.", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`A common trap: zero field does not imply zero potential. Inside a uniform shell, field is zero and potential is the constant value $-GM/R$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["conceptual", "field-potential"],
  },
  {
    id: "grav-q12-two-mass-potential-energy",
    subtopicId: "grav-potential-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "Two point masses $m_1$ and $m_2$ are separated by distance $r$. Their gravitational potential energy, taking zero at infinity, is:",
    options: [
      { id: "A", text: "$\\frac{Gm_1m_2}{r^2}$", isCorrect: false },
      { id: "B", text: "$-\\frac{Gm_1m_2}{r}$", isCorrect: true },
      { id: "C", text: "$\\frac{Gm_1m_2}{r}$", isCorrect: false },
      { id: "D", text: "$-\\frac{Gm_1m_2}{r^2}$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`With zero potential energy at infinity, an attractive gravitational system has negative potential energy: $U=-Gm_1m_2/r$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 60,
    tags: ["potential-energy"],
  },
  {
    id: "grav-q13-escape-earth-angle",
    subtopicId: "grav-binding-escape",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "Earth's escape speed is $11.2\\,\\text{km/s}$ for vertical projection. If a body is projected at $45^\\circ$ to the vertical, the ideal escape speed is:",
    options: [
      { id: "A", text: "$11.2\\,\\text{km/s}$", isCorrect: true },
      { id: "B", text: "$22.4\\,\\text{km/s}$", isCorrect: false },
      { id: "C", text: "$11.2/\\sqrt2\\,\\text{km/s}$", isCorrect: false },
      { id: "D", text: "depends on mass of body", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`Escape speed depends on total mechanical energy, not launch direction, in the ideal no-atmosphere model. Therefore it remains $11.2\\,\\text{km/s}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 70,
    tags: ["escape-velocity", "conceptual"],
  },
  {
    id: "grav-q14-escape-jupiter",
    subtopicId: "grav-binding-escape",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "Jupiter has mass $318$ times Earth and radius $11.2$ times Earth. If Earth's escape speed is $11.2\\,\\text{km/s}$, Jupiter's escape speed is closest to:",
    options: [
      { id: "A", text: "$11.2\\,\\text{km/s}$", isCorrect: false },
      { id: "B", text: "$59.7\\,\\text{km/s}$", isCorrect: true },
      { id: "C", text: "$318\\,\\text{km/s}$", isCorrect: false },
      { id: "D", text: "$5.97\\,\\text{km/s}$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Since $v_e\propto \sqrt{M/R}$, $\frac{v_J}{v_E}=\sqrt{318/11.2}\approx5.33$. Thus $v_J\approx11.2\times5.33=59.7\\,\\text{km/s}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 120,
    tags: ["escape-velocity", "ratio"],
  },
  {
    id: "grav-q15-projectile-three-escape",
    subtopicId: "grav-binding-escape",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "A body is projected from Earth's surface with three times the escape speed. Its speed far away from Earth is:",
    options: [
      { id: "A", text: "$v_e$", isCorrect: false },
      { id: "B", text: "$2v_e$", isCorrect: false },
      { id: "C", text: "$2\\sqrt2\,v_e$", isCorrect: true },
      { id: "D", text: "$3v_e$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Use energy: $\frac12m(3v_e)^2-\frac{GMm}{R}=\frac12mv_\infty^2$. Since $\frac12mv_e^2=GMm/R$, we get $\frac12m(9v_e^2)-\frac12m(2v_e^2)=\frac12mv_\infty^2$, so $v_\infty=\sqrt8v_e=2\sqrt2v_e$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 150,
    tags: ["escape-velocity", "energy"],
  },
  {
    id: "grav-q16-kepler-third-law",
    subtopicId: "grav-kepler-planets",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "For planets orbiting the same star, Kepler's third law says:",
    options: [
      { id: "A", text: "$T\\propto r^3$", isCorrect: false },
      { id: "B", text: "$T^2\\propto r^3$", isCorrect: true },
      { id: "C", text: "$T^3\\propto r^2$", isCorrect: false },
      { id: "D", text: "$T\\propto r^{-2}$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`For circular orbits, $\frac{GMm}{r^2}=\frac{mv^2}{r}$ and $T=2\pi r/v$. Combining gives $T^2=\frac{4\pi^2}{GM}r^3$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 60,
    tags: ["kepler", "period"],
  },
  {
    id: "grav-q17-planet-fastest",
    subtopicId: "grav-kepler-planets",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "A planet in an elliptical orbit around the sun moves fastest when it is:",
    options: [
      { id: "A", text: "farthest from the sun", isCorrect: false },
      { id: "B", text: "closest to the sun", isCorrect: true },
      { id: "C", text: "at the minor axis only", isCorrect: false },
      { id: "D", text: "always moving with constant speed", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`By conservation of angular momentum, $mvr$ is constant at closest and farthest points. When $r$ is smallest, $v$ must be largest.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["kepler-second-law", "ellipse"],
  },
  {
    id: "grav-q18-saturn-year",
    subtopicId: "grav-kepler-planets",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "Saturn's year is $29.5$ Earth years. If Earth is $1.5\\times10^8\\,\\text{km}$ from the sun, Saturn's approximate distance is:",
    options: [
      { id: "A", text: "$1.43\\times10^9\\,\\text{km}$", isCorrect: true },
      { id: "B", text: "$2.95\\times10^8\\,\\text{km}$", isCorrect: false },
      { id: "C", text: "$4.43\\times10^8\\,\\text{km}$", isCorrect: false },
      { id: "D", text: "$1.5\\times10^9\\,\\text{m}$", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`Using $T^2\propto R^3$, $R_S=R_E(T_S/T_E)^{2/3}=1.5\times10^8(29.5)^{2/3}\\approx1.43\times10^9\\,\\text{km}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 140,
    tags: ["kepler-third-law", "ratio"],
  },
  {
    id: "grav-q19-satellite-speed-mass",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "Two satellites orbit Earth in circular orbits of the same radius. One satellite has ten times the mass of the other. Their periods are in the ratio:",
    options: [
      { id: "A", text: "$100:1$", isCorrect: false },
      { id: "B", text: "$10:1$", isCorrect: false },
      { id: "C", text: "$1:10$", isCorrect: false },
      { id: "D", text: "$1:1$", isCorrect: true },
    ],
    correctAnswer: "D",
    explanationMarkdown: String.raw`For circular orbit, $T=2\pi\sqrt{r^3/GM}$. It depends on orbital radius and central mass, not satellite mass. Same radius means same period.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 70,
    tags: ["satellite", "period"],
  },
  {
    id: "grav-q20-satellite-energy-relation",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "For a satellite in a circular orbit, if $U$ is potential energy, $K$ is kinetic energy, and $E$ is total energy, then:",
    options: [
      { id: "A", text: "$U=K=E$", isCorrect: false },
      { id: "B", text: "$K=|E|=|U|/2$", isCorrect: true },
      { id: "C", text: "$K=2|U|$", isCorrect: false },
      { id: "D", text: "$E=0$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`For circular orbit, $K=GMm/(2r)$, $U=-GMm/r$, and $E=-GMm/(2r)$. Hence $K=|E|=|U|/2$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 100,
    tags: ["satellite-energy"],
  },
  {
    id: "grav-q21-orbit-shift",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 4,
    questionText:
      "Energy required to shift a satellite from orbital radius $r$ to $2r$ is $E$. The energy required to shift it from $2r$ to $3r$ is:",
    options: [
      { id: "A", text: "$E$", isCorrect: false },
      { id: "B", text: "$E/2$", isCorrect: false },
      { id: "C", text: "$E/3$", isCorrect: true },
      { id: "D", text: "$2E$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Total energy in orbit radius $r$ is $-GMm/(2r)$. From $r$ to $2r$, $\Delta E=GMm/(4r)$. From $2r$ to $3r$, $\Delta E=GMm/(12r)$. Therefore the second energy is $E/3$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 150,
    tags: ["orbit-transfer", "energy"],
  },
  {
    id: "grav-q22-geostationary-condition",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "A geostationary satellite must:",
    options: [
      { id: "A", text: "have a 24-hour period and move in the equatorial plane in Earth's rotation direction", isCorrect: true },
      { id: "B", text: "have any 24-hour orbit around Earth", isCorrect: false },
      { id: "C", text: "move in a polar orbit", isCorrect: false },
      { id: "D", text: "remain stationary without gravitational force", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`To appear fixed over one point, the satellite needs a 24-hour period, equatorial orbit, and the same sense of rotation as Earth.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["geostationary"],
  },
  {
    id: "grav-q23-cavity-superposition",
    subtopicId: "grav-jee-mixed-practice",
    questionType: "mcq_single",
    difficulty: 4,
    questionText:
      "A spherical cavity is made inside a uniform solid sphere. The best method to find gravitational field inside the cavity is to model the body as:",
    options: [
      { id: "A", text: "only the remaining irregular body directly", isCorrect: false },
      { id: "B", text: "full sphere plus a positive smaller sphere", isCorrect: false },
      { id: "C", text: "full sphere minus the removed smaller sphere", isCorrect: true },
      { id: "D", text: "a point mass at the cavity center only", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Use superposition. The actual body equals the original full sphere plus a negative-mass sphere occupying the removed cavity. Practically, calculate field of full sphere and subtract field of removed sphere.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 100,
    tags: ["cavity", "superposition"],
  },
  {
    id: "grav-q24-graph-g-distance",
    subtopicId: "grav-jee-mixed-practice",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "For a uniform Earth, the graph of $g$ versus distance $r$ from Earth's center is:",
    options: [
      { id: "A", text: "constant inside and inverse-square outside", isCorrect: false },
      { id: "B", text: "linear inside and inverse-square outside", isCorrect: true },
      { id: "C", text: "inverse-square everywhere", isCorrect: false },
      { id: "D", text: "zero inside and inverse-square outside", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Inside a uniform solid sphere, $g=GMr/R^3$, so it is linear in $r$. Outside, $g=GM/r^2$, so it decreases as inverse square.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["graphs", "variation-g"],
  },
  {
    id: "grav-q25-satellite-net-force",
    subtopicId: "grav-jee-mixed-practice",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "A satellite is orbiting Earth. The centripetal force is $F$, and Earth's gravitational force on it is also $F$. The net force on the satellite is:",
    options: [
      { id: "A", text: "zero", isCorrect: false },
      { id: "B", text: "$F$", isCorrect: true },
      { id: "C", text: "$2F$", isCorrect: false },
      { id: "D", text: "$F/2$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Centripetal force is not an additional force. It is the name for the inward net force required for circular motion. Here gravity provides that net force, so the net force is $F$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 70,
    tags: ["satellite", "conceptual"],
  },
  {
    id: "grav-q26-density-radius-same-g",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "A planet has twice Earth's density but the same surface acceleration due to gravity as Earth. Its radius in terms of Earth's radius $R$ is:",
    options: [
      { id: "A", text: "$R/4$", isCorrect: false },
      { id: "B", text: "$R/2$", isCorrect: true },
      { id: "C", text: "$R$", isCorrect: false },
      { id: "D", text: "$2R$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`For a spherical planet, $g=\frac{GM}{R^2}=\frac{4}{3}\pi G\rho R$. If density doubles but $g$ stays the same, radius must become half: $R'=R/2$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 120,
    tags: ["density", "surface-gravity"],
  },
  {
    id: "grav-q27-double-mass-radius",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "A planet has twice Earth's mass and twice Earth's radius. If Earth's surface gravity is $9.8\\,\\text{m/s}^2$, the planet's surface gravity is:",
    options: [
      { id: "A", text: "$19.6\\,\\text{m/s}^2$", isCorrect: false },
      { id: "B", text: "$9.8\\,\\text{m/s}^2$", isCorrect: false },
      { id: "C", text: "$4.9\\,\\text{m/s}^2$", isCorrect: true },
      { id: "D", text: "$2.45\\,\\text{m/s}^2$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Since $g\propto M/R^2$, the new value is $g' = g\cdot \frac{2}{2^2}=g/2=4.9\\,\\text{m/s}^2$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["surface-gravity", "ratio"],
  },
  {
    id: "grav-q28-satellite-radius-speed",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "Satellite A orbits a planet at radius $4R$ with speed $3V$. Satellite B orbits the same planet at radius $R$. The speed of B is:",
    options: [
      { id: "A", text: "$3V/2$", isCorrect: false },
      { id: "B", text: "$3V$", isCorrect: false },
      { id: "C", text: "$6V$", isCorrect: true },
      { id: "D", text: "$12V$", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Orbital speed $v=\sqrt{GM/r}$, so $v\propto 1/\sqrt r$. Moving from $4R$ to $R$ doubles the speed. Hence $v_B=2(3V)=6V$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["satellite-speed", "ratio"],
  },
  {
    id: "grav-q29-g-by-nine-height",
    subtopicId: "grav-variation-g",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "At what height above Earth's surface does acceleration due to gravity become $g/9$?",
    options: [
      { id: "A", text: "$R$", isCorrect: false },
      { id: "B", text: "$2R$", isCorrect: true },
      { id: "C", text: "$3R$", isCorrect: false },
      { id: "D", text: "$R/2$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`At height $h$, $g_h=g\frac{R^2}{(R+h)^2}$. Set $g_h=g/9$, so $(R+h)^2=9R^2$, giving $R+h=3R$ and $h=2R$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 100,
    tags: ["height", "variation-g"],
  },
  {
    id: "grav-q30-zero-field-potential",
    subtopicId: "grav-potential-energy",
    questionType: "mcq_single",
    difficulty: 4,
    questionText:
      "Two point masses $m$ and $4m$ are separated by distance $r$. The gravitational potential at the point between them where the gravitational field is zero is:",
    options: [
      { id: "A", text: "$-\\frac{3Gm}{r}$", isCorrect: false },
      { id: "B", text: "$-\\frac{6Gm}{r}$", isCorrect: false },
      { id: "C", text: "$-\\frac{9Gm}{r}$", isCorrect: true },
      { id: "D", text: "zero", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`Let the zero-field point be $x$ from mass $m$. Then $\frac{Gm}{x^2}=\frac{4Gm}{(r-x)^2}$, so $r-x=2x$ and $x=r/3$. Potential is $V=-Gm/(r/3)-G(4m)/(2r/3)=-9Gm/r$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 150,
    tags: ["potential", "zero-field"],
  },
  {
    id: "grav-q31-work-against-gravity",
    subtopicId: "grav-potential-energy",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "A $10\\,\\text{g}$ particle is on the surface of a uniform sphere of mass $100\\,\\text{kg}$ and radius $10\\,\\text{cm}$. Work needed to take it far away is closest to:",
    options: [
      { id: "A", text: "$6.67\\times10^{-10}\\,\\text{J}$", isCorrect: true },
      { id: "B", text: "$6.67\\times10^{-8}\\,\\text{J}$", isCorrect: false },
      { id: "C", text: "$3.33\\times10^{-10}\\,\\text{J}$", isCorrect: false },
      { id: "D", text: "$1.33\\times10^{-9}\\,\\text{J}$", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`Work required equals binding energy $GMm/R$. Here $M=100$, $m=0.01$, $R=0.1$, so $GMm/R=6.67\times10^{-11}\cdot(1/0.1)=6.67\times10^{-10}\\,\\text{J}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 130,
    tags: ["work", "potential-energy"],
  },
  {
    id: "grav-q32-period-four-times-radius",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 2,
    questionText:
      "An Earth satellite has period $5$ hours. If its orbital radius becomes $4$ times the previous radius, its new period is:",
    options: [
      { id: "A", text: "$10$ hours", isCorrect: false },
      { id: "B", text: "$20$ hours", isCorrect: false },
      { id: "C", text: "$40$ hours", isCorrect: true },
      { id: "D", text: "$80$ hours", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`For satellites around the same planet, $T\propto r^{3/2}$. If $r$ becomes $4r$, period becomes $4^{3/2}=8$ times. New period $=5\times8=40$ hours.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["period", "kepler-third-law"],
  },
  {
    id: "grav-q33-launch-to-2r-altitude",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 4,
    questionText:
      "Minimum energy required to launch a satellite of mass $m$ from Earth's surface into a circular orbit at altitude $2R$ is:",
    options: [
      { id: "A", text: "$\\frac{GMm}{R}$", isCorrect: false },
      { id: "B", text: "$\\frac{5GMm}{6R}$", isCorrect: true },
      { id: "C", text: "$\\frac{GMm}{6R}$", isCorrect: false },
      { id: "D", text: "$\\frac{2GMm}{3R}$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`Initial energy at rest on surface is $-GMm/R$. Orbit altitude $2R$ means orbital radius $3R$, so final circular-orbit energy is $-GMm/(2\cdot3R)=-GMm/(6R)$. Energy required $= -GMm/(6R)+GMm/R=5GMm/(6R)$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 160,
    tags: ["launch-energy", "satellite"],
  },
  {
    id: "grav-q34-potential-ratio-uniform-field",
    subtopicId: "grav-jee-mixed-practice",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "In a region, gravitational field is $\\vec E=5\\hat i+12\\hat j\\,\\text{N/kg}$. Taking potential at the origin as zero, the ratio of potentials at $(12,0)$ and $(0,5)$ is:",
    options: [
      { id: "A", text: "$0$", isCorrect: false },
      { id: "B", text: "$1$", isCorrect: true },
      { id: "C", text: "$144/25$", isCorrect: false },
      { id: "D", text: "$25/144$", isCorrect: false },
    ],
    correctAnswer: "B",
    explanationMarkdown: String.raw`For constant field, $V=-\vec E\cdot\vec r$ when $V(0)=0$. At $(12,0)$, $V=-60$. At $(0,5)$, $V=-60$. Ratio is $1$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 120,
    tags: ["field-potential", "vector"],
  },
  {
    id: "grav-q35-package-released",
    subtopicId: "grav-satellites-energy",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "An artificial satellite releases a package. If air resistance is neglected, the package will:",
    options: [
      { id: "A", text: "hit Earth exactly below the release point", isCorrect: false },
      { id: "B", text: "fall behind the satellite and hit Earth", isCorrect: false },
      { id: "C", text: "move ahead and hit Earth", isCorrect: false },
      { id: "D", text: "continue in essentially the same orbit", isCorrect: true },
    ],
    correctAnswer: "D",
    explanationMarkdown: String.raw`At release, the package has the same position and velocity as the satellite. With only gravity acting and no air resistance, it follows the same orbital path rather than dropping straight down.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 90,
    tags: ["satellite", "conceptual"],
  },
  {
    id: "grav-q36-moon-atmosphere",
    subtopicId: "grav-binding-escape",
    questionType: "mcq_single",
    difficulty: 2,
    questionText: "The Moon has practically no atmosphere mainly because:",
    options: [
      { id: "A", text: "it is closer to Earth", isCorrect: false },
      { id: "B", text: "it reflects sunlight", isCorrect: false },
      { id: "C", text: "gas molecules can exceed its low escape speed", isCorrect: true },
      { id: "D", text: "it does not rotate", isCorrect: false },
    ],
    correctAnswer: "C",
    explanationMarkdown: String.raw`The Moon's escape speed is small. At ordinary temperatures, many gas molecules have speeds comparable to or greater than this escape speed, so they gradually escape.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 80,
    tags: ["escape-velocity", "atmosphere"],
  },
  {
    id: "grav-q37-imaginary-planet-escape",
    subtopicId: "grav-binding-escape",
    questionType: "mcq_single",
    difficulty: 3,
    questionText:
      "An imaginary planet has twice Earth's mass and thrice Earth's radius. If Earth's escape speed is $v_e$, the planet's escape speed is:",
    options: [
      { id: "A", text: "$v_e\\sqrt{2/3}$", isCorrect: true },
      { id: "B", text: "$v_e\\sqrt{3/2}$", isCorrect: false },
      { id: "C", text: "$2v_e/3$", isCorrect: false },
      { id: "D", text: "$3v_e/2$", isCorrect: false },
    ],
    correctAnswer: "A",
    explanationMarkdown: String.raw`Escape speed varies as $\sqrt{M/R}$. Therefore $v' / v_e=\sqrt{(2M/3R)/(M/R)}=\sqrt{2/3}$.`,
    positiveMarks: 4,
    negativeMarks: 1,
    timeExpectedSeconds: 100,
    tags: ["escape-velocity", "ratio"],
  },
];
