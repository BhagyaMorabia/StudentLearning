#!/usr/bin/env python3
"""
jee_syllabus.py — Complete JEE Mains + Advanced Syllabus Definition

Contains the ENTIRE JEE curriculum structured as:
  Subject → Chapter (class year, JEE weightage) → Topic → Subtopic

Each subtopic has:
  - name: Exact concept name
  - jee_freq: 1-5 (how often it appears in PYQs)
  - est_min: Estimated study time in minutes
  - q_types: Question types that appear in JEE
  - patterns: Typical JEE question patterns for this subtopic

This file is the single source of truth for the curriculum tree.
"""

# Short aliases for question types
MCQ = "MCQ"
MSQ = "MSQ"
INT = "INTEGER"
NUM = "NUMERICAL"

def _s(name, jee_freq=3, est_min=15, q_types=None, patterns=None, prereqs=None):
    """Helper to create a subtopic dict compactly."""
    return {
        "name": name,
        "jee_freq": jee_freq,
        "est_min": est_min,
        "q_types": q_types or [MCQ],
        "patterns": patterns or [],
        "prerequisites": prereqs or [],
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  PHYSICS
# ═══════════════════════════════════════════════════════════════════════════════

PHYSICS_CHAPTERS = [
    # ── CLASS 11 ──────────────────────────────────────────────────────────────
    {
        "name": "Units and Measurements",
        "class_year": 11,
        "jee_weightage_pct": 2.0,
        "topics": [
            {
                "name": "Physical Quantities and Units",
                "subtopics": [
                    _s("Fundamental and Derived Quantities", 2, 10, [MCQ], ["Dimensional consistency checks"]),
                    _s("SI Units and Conversions", 2, 10, [MCQ], ["Unit conversion in compound quantities"]),
                    _s("Dimensional Analysis", 4, 20, [MCQ, INT], ["Deriving relations using dimensions", "Checking dimensional homogeneity"]),
                    _s("Significant Figures and Rounding", 2, 10, [MCQ], ["Counting sig figs in calculations"]),
                    _s("Errors in Measurement", 3, 15, [MCQ, NUM], ["Percentage error propagation", "Combining absolute and relative errors"]),
                ],
            },
        ],
    },
    {
        "name": "Motion in a Straight Line",
        "class_year": 11,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Kinematics in 1D",
                "subtopics": [
                    _s("Position, Displacement and Distance", 2, 10, [MCQ]),
                    _s("Speed and Velocity", 2, 10, [MCQ]),
                    _s("Acceleration and Equations of Motion", 4, 20, [MCQ, NUM], ["Multi-step kinematic problems", "Graphs to equations"]),
                    _s("Motion Under Gravity (Free Fall)", 4, 20, [MCQ, NUM, INT], ["Time of flight, max height", "Dropped vs thrown problems"]),
                    _s("Relative Motion in 1D", 3, 15, [MCQ, NUM], ["Train/car crossing problems", "River-boat 1D analogy"]),
                    _s("Graphical Analysis of Motion", 4, 15, [MCQ], ["v-t and x-t graph interpretation", "Area under v-t = displacement"]),
                ],
            },
        ],
    },
    {
        "name": "Motion in a Plane",
        "class_year": 11,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Vectors",
                "subtopics": [
                    _s("Vector Addition and Subtraction", 3, 15, [MCQ, NUM], ["Triangle and parallelogram law"]),
                    _s("Resolution of Vectors and Components", 4, 15, [MCQ, NUM], ["Breaking forces into x-y components"]),
                    _s("Dot Product and Cross Product", 4, 15, [MCQ, INT], ["Work as dot product", "Torque as cross product"]),
                    _s("Unit Vectors and Position Vectors", 2, 10, [MCQ]),
                ],
            },
            {
                "name": "2D Kinematics",
                "subtopics": [
                    _s("Projectile Motion", 5, 25, [MCQ, NUM, INT], ["Range, max height, time of flight", "Projectile on inclined plane", "Relative projectile problems"]),
                    _s("Projectile Motion on Inclined Plane", 4, 20, [MCQ, NUM], ["Up-the-incline and down-the-incline launches"]),
                    _s("Relative Motion in 2D", 4, 20, [MCQ, NUM], ["Rain-man problems", "River-boat crossing (shortest time vs shortest path)"]),
                    _s("Uniform Circular Motion", 5, 20, [MCQ, NUM], ["Centripetal acceleration derivation", "Banking of roads"]),
                    _s("Non-Uniform Circular Motion", 4, 15, [MCQ, NUM], ["Tangential and radial acceleration", "Speed varying on circular path"]),
                ],
            },
        ],
    },
    {
        "name": "Laws of Motion",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Newton's Laws",
                "subtopics": [
                    _s("Newton's First Law and Inertia", 2, 10, [MCQ]),
                    _s("Newton's Second Law (F=ma)", 5, 20, [MCQ, NUM, INT], ["Multi-body FBD problems", "Acceleration of systems"]),
                    _s("Newton's Third Law and Action-Reaction Pairs", 3, 10, [MCQ]),
                    _s("Free Body Diagrams", 5, 25, [MCQ, NUM], ["Identifying all forces", "Constraint equations from FBDs"]),
                    _s("Constraint Relations and String Constraints", 5, 25, [MCQ, NUM, INT], ["Pulley systems", "Wedge-block constraints"]),
                ],
            },
            {
                "name": "Friction",
                "subtopics": [
                    _s("Static and Kinetic Friction", 4, 20, [MCQ, NUM], ["Threshold problems", "Friction on inclines"]),
                    _s("Friction on Inclined Planes", 4, 20, [MCQ, NUM], ["Angle of repose", "Pushing vs pulling on incline"]),
                    _s("Friction in Pulley and Wedge Systems", 4, 20, [MCQ, NUM, INT], ["Block-on-block with friction"]),
                ],
            },
            {
                "name": "Circular Motion Dynamics",
                "subtopics": [
                    _s("Centripetal Force and Its Sources", 4, 15, [MCQ, NUM], ["Identifying the force providing centripetal acceleration"]),
                    _s("Motion in a Vertical Circle", 5, 25, [MCQ, NUM, INT], ["Minimum speed at top", "String vs rod problems"]),
                    _s("Conical Pendulum", 3, 15, [MCQ, NUM], ["Tension and angle relationship"]),
                ],
            },
        ],
    },
    {
        "name": "Work, Energy and Power",
        "class_year": 11,
        "jee_weightage_pct": 5.5,
        "topics": [
            {
                "name": "Work and Energy",
                "subtopics": [
                    _s("Work Done by Constant and Variable Forces", 4, 20, [MCQ, NUM], ["Work as area under F-x curve", "Work by friction, gravity, spring"]),
                    _s("Kinetic Energy and Work-Energy Theorem", 5, 20, [MCQ, NUM, INT], ["Net work equals change in KE"]),
                    _s("Potential Energy (Gravitational and Elastic)", 4, 20, [MCQ, NUM], ["PE of spring system", "Gravitational PE near Earth"]),
                    _s("Conservation of Mechanical Energy", 5, 25, [MCQ, NUM, INT], ["Roller coaster problems", "Pendulum energy conservation"]),
                    _s("Non-Conservative Forces and Energy Loss", 3, 15, [MCQ, NUM], ["Work done by friction = energy lost"]),
                ],
            },
            {
                "name": "Power and Collisions",
                "subtopics": [
                    _s("Power (Instantaneous and Average)", 3, 15, [MCQ, NUM], ["P = Fv problems", "Engine climbing problems"]),
                    _s("Elastic and Inelastic Collisions in 1D", 5, 25, [MCQ, NUM, INT], ["Coefficient of restitution", "Head-on collisions"]),
                    _s("Oblique Collisions in 2D", 4, 20, [MCQ, NUM], ["Glancing collisions", "Ball hitting wall at angle"]),
                ],
            },
        ],
    },
    {
        "name": "System of Particles and Rotational Motion",
        "class_year": 11,
        "jee_weightage_pct": 7.0,
        "topics": [
            {
                "name": "Centre of Mass",
                "subtopics": [
                    _s("Centre of Mass of Discrete and Continuous Systems", 4, 20, [MCQ, NUM], ["COM of L-shaped lamina", "COM by integration"]),
                    _s("Motion of Centre of Mass", 4, 20, [MCQ, NUM, INT], ["Explosion/breakup problems", "Two-body COM motion"]),
                    _s("Linear Momentum and Conservation", 5, 20, [MCQ, NUM, INT], ["Recoil of gun", "Man on boat problems"]),
                ],
            },
            {
                "name": "Rotational Mechanics",
                "subtopics": [
                    _s("Moment of Inertia and Parallel/Perpendicular Axis Theorems", 5, 25, [MCQ, NUM, INT], ["MOI of composite bodies", "Parallel axis theorem application"]),
                    _s("Torque and Angular Momentum", 5, 25, [MCQ, NUM, INT], ["Torque about a point vs axis", "Angular momentum conservation"]),
                    _s("Rotational Kinematic Equations", 3, 15, [MCQ, NUM], ["Angular velocity, acceleration", "Analogues of linear kinematics"]),
                    _s("Rolling Motion (Pure Rolling)", 5, 25, [MCQ, NUM, INT], ["Rolling on incline", "Condition for pure rolling", "Kinetic energy in rolling"]),
                    _s("Angular Momentum Conservation", 5, 20, [MCQ, NUM, INT], ["Ice skater spin", "Collision with rotating body"]),
                    _s("Combined Translation and Rotation", 4, 20, [MCQ, NUM], ["Toppling conditions", "Hinge problems"]),
                ],
            },
        ],
    },
    {
        "name": "Gravitation",
        "class_year": 11,
        "jee_weightage_pct": 4.5,
        "topics": [
            {
                "name": "Gravitational Force and Field",
                "subtopics": [
                    _s("Newton's Law of Universal Gravitation", 3, 15, [MCQ, NUM], ["Force between extended bodies"]),
                    _s("Gravitational Field and Potential", 4, 20, [MCQ, NUM], ["Field due to ring, shell, sphere", "Gravitational potential energy"]),
                    _s("Acceleration Due to Gravity Variations", 4, 15, [MCQ, NUM, INT], ["g with altitude, depth, latitude", "Effective g with rotation"]),
                    _s("Gravitational Potential Energy of Systems", 4, 20, [MCQ, NUM], ["PE of two-mass, three-mass systems", "Self-energy of sphere"]),
                ],
            },
            {
                "name": "Orbital Mechanics",
                "subtopics": [
                    _s("Orbital Velocity and Escape Velocity", 5, 20, [MCQ, NUM, INT], ["Derivation and comparison", "Escape from surface vs orbit"]),
                    _s("Kepler's Laws of Planetary Motion", 4, 15, [MCQ, NUM], ["Areal velocity", "T² ∝ a³ applications"]),
                    _s("Satellite Motion and Energy", 4, 20, [MCQ, NUM], ["Total energy of satellite", "Geostationary orbit"]),
                    _s("Binding Energy and Escape Conditions", 3, 15, [MCQ, NUM], ["Energy needed to move satellite between orbits"]),
                ],
            },
        ],
    },
    {
        "name": "Mechanical Properties of Solids",
        "class_year": 11,
        "jee_weightage_pct": 2.5,
        "topics": [
            {
                "name": "Elasticity",
                "subtopics": [
                    _s("Stress, Strain and Hooke's Law", 3, 15, [MCQ, NUM], ["Stress-strain curve interpretation"]),
                    _s("Young's Modulus, Bulk Modulus and Shear Modulus", 3, 15, [MCQ, NUM], ["Comparing elastic moduli"]),
                    _s("Elastic Potential Energy in Stretched Wire", 3, 15, [MCQ, NUM], ["Energy stored = ½ × stress × strain × volume"]),
                    _s("Thermal Stress", 3, 15, [MCQ, NUM], ["Stress developed when expansion prevented"]),
                ],
            },
        ],
    },
    {
        "name": "Mechanical Properties of Fluids",
        "class_year": 11,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Fluid Statics",
                "subtopics": [
                    _s("Pressure and Pascal's Law", 3, 15, [MCQ, NUM], ["Hydraulic press", "Pressure at depth"]),
                    _s("Buoyancy and Archimedes' Principle", 4, 20, [MCQ, NUM, INT], ["Floating and sinking conditions", "Apparent weight"]),
                    _s("Atmospheric Pressure and Barometers", 2, 10, [MCQ]),
                ],
            },
            {
                "name": "Fluid Dynamics",
                "subtopics": [
                    _s("Equation of Continuity", 3, 10, [MCQ, NUM], ["A₁v₁ = A₂v₂ applications"]),
                    _s("Bernoulli's Principle and Applications", 4, 20, [MCQ, NUM, INT], ["Venturi meter", "Lift on airplane wing", "Torricelli's theorem"]),
                    _s("Viscosity and Stokes' Law", 3, 15, [MCQ, NUM], ["Terminal velocity of sphere"]),
                    _s("Surface Tension and Capillarity", 3, 15, [MCQ, NUM], ["Capillary rise", "Excess pressure in drops/bubbles"]),
                ],
            },
        ],
    },
    {
        "name": "Thermal Properties of Matter",
        "class_year": 11,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Heat and Temperature",
                "subtopics": [
                    _s("Thermal Expansion (Linear, Area, Volume)", 3, 15, [MCQ, NUM], ["Bimetallic strip", "Expansion of cavity"]),
                    _s("Calorimetry and Specific Heat", 3, 15, [MCQ, NUM], ["Mixing problems", "Ice-water-steam transitions"]),
                    _s("Latent Heat and Phase Changes", 3, 15, [MCQ, NUM], ["Energy required for phase transitions"]),
                ],
            },
            {
                "name": "Heat Transfer",
                "subtopics": [
                    _s("Conduction and Thermal Conductivity", 4, 20, [MCQ, NUM], ["Series and parallel thermal resistance", "Temperature distribution in rod"]),
                    _s("Convection (Qualitative)", 1, 5, [MCQ]),
                    _s("Radiation and Stefan-Boltzmann Law", 4, 20, [MCQ, NUM, INT], ["Wien's law", "Newton's law of cooling", "Net radiation exchange"]),
                ],
            },
        ],
    },
    {
        "name": "Thermodynamics",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Laws of Thermodynamics",
                "subtopics": [
                    _s("Zeroth Law and Thermal Equilibrium", 1, 5, [MCQ]),
                    _s("First Law of Thermodynamics", 5, 20, [MCQ, NUM, INT], ["ΔU = Q - W for various processes"]),
                    _s("Work Done in Thermodynamic Processes", 5, 20, [MCQ, NUM], ["P-V diagram work calculation", "Isothermal vs adiabatic work"]),
                    _s("Isothermal and Adiabatic Processes", 5, 25, [MCQ, NUM, INT], ["PVγ = const applications", "Slope comparison on P-V diagram"]),
                    _s("Isobaric and Isochoric Processes", 3, 15, [MCQ, NUM]),
                    _s("Cyclic Processes and P-V Diagrams", 5, 25, [MCQ, NUM, INT], ["Efficiency of cycles", "Net work from area"]),
                ],
            },
            {
                "name": "Heat Engines and Entropy",
                "subtopics": [
                    _s("Second Law of Thermodynamics", 3, 10, [MCQ]),
                    _s("Carnot Engine and Efficiency", 4, 20, [MCQ, NUM], ["Carnot efficiency formula", "Refrigerator COP"]),
                    _s("Entropy (Conceptual)", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Kinetic Theory of Gases",
        "class_year": 11,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Kinetic Theory",
                "subtopics": [
                    _s("Ideal Gas Equation (PV = nRT)", 4, 15, [MCQ, NUM], ["Gas mixtures", "Dalton's law"]),
                    _s("Kinetic Interpretation of Temperature", 3, 15, [MCQ, NUM], ["½mv²_rms = 3/2 kT"]),
                    _s("RMS, Average and Most Probable Speeds", 4, 15, [MCQ, NUM, INT], ["Speed ratios and distributions"]),
                    _s("Degrees of Freedom and Equipartition of Energy", 4, 20, [MCQ, NUM], ["Cp, Cv, γ for mono/di/polyatomic"]),
                    _s("Mean Free Path", 2, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Oscillations",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Simple Harmonic Motion",
                "subtopics": [
                    _s("SHM Definition and Equations", 5, 20, [MCQ, NUM], ["x = A sin(ωt + φ)", "Phase and initial conditions"]),
                    _s("Energy in SHM", 4, 20, [MCQ, NUM, INT], ["KE and PE as function of x", "Total energy = ½kA²"]),
                    _s("Spring-Mass Systems (Series, Parallel, Combinations)", 5, 25, [MCQ, NUM, INT], ["Reduced mass", "Springs in series/parallel"]),
                    _s("Simple Pendulum", 4, 15, [MCQ, NUM], ["T = 2π√(l/g)", "Effective g in accelerating frame"]),
                    _s("Physical Pendulum and Torsional Pendulum", 3, 15, [MCQ, NUM]),
                    _s("Superposition of SHMs and Lissajous Figures", 3, 15, [MCQ], ["Same frequency: resultant amplitude"]),
                    _s("Damped and Forced Oscillations (Resonance)", 3, 15, [MCQ], ["Resonance condition"]),
                ],
            },
        ],
    },
    {
        "name": "Waves",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Wave Motion",
                "subtopics": [
                    _s("Transverse and Longitudinal Waves", 2, 10, [MCQ]),
                    _s("Wave Equation y = A sin(kx - ωt)", 4, 15, [MCQ, NUM], ["Finding v, λ, f from equation"]),
                    _s("Speed of Waves (String, Sound)", 3, 15, [MCQ, NUM], ["v = √(T/μ) for string"]),
                    _s("Superposition Principle and Interference", 4, 20, [MCQ, NUM], ["Constructive and destructive conditions"]),
                    _s("Standing Waves on Strings and Pipes", 5, 25, [MCQ, NUM, INT], ["Harmonics in open/closed pipes", "Nodes and antinodes"]),
                    _s("Beats", 4, 15, [MCQ, NUM, INT], ["Beat frequency = |f₁ - f₂|"]),
                    _s("Doppler Effect in Sound", 5, 25, [MCQ, NUM, INT], ["Source moving, observer moving, both moving", "Apparent frequency formula"]),
                ],
            },
        ],
    },
    # ── CLASS 12 ──────────────────────────────────────────────────────────────
    {
        "name": "Electric Charges and Fields",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Electrostatics Fundamentals",
                "subtopics": [
                    _s("Coulomb's Law and Superposition", 4, 20, [MCQ, NUM], ["Force on charge due to multiple charges"]),
                    _s("Electric Field Due to Point Charges", 4, 15, [MCQ, NUM], ["Field at equidistant point"]),
                    _s("Electric Field Lines and Properties", 2, 10, [MCQ]),
                    _s("Electric Dipole and Dipole Field", 4, 20, [MCQ, NUM], ["Axial and equatorial fields", "Torque on dipole"]),
                    _s("Electric Flux and Gauss's Law", 5, 25, [MCQ, NUM, INT], ["Flux through surfaces", "Field of infinite plane, cylinder, sphere"]),
                    _s("Applications of Gauss's Law", 5, 25, [MCQ, NUM], ["Conducting sphere", "Infinite line charge", "Sheet of charge"]),
                ],
            },
        ],
    },
    {
        "name": "Electrostatic Potential and Capacitance",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Electric Potential",
                "subtopics": [
                    _s("Electric Potential Due to Point Charges", 4, 15, [MCQ, NUM], ["Potential at a point due to system of charges"]),
                    _s("Equipotential Surfaces", 3, 10, [MCQ]),
                    _s("Relation Between E and V", 4, 15, [MCQ, NUM], ["E = -dV/dr", "Finding E from V(x,y,z)"]),
                    _s("Potential Energy of Charge Systems", 4, 20, [MCQ, NUM, INT], ["PE of 3-charge, 4-charge systems"]),
                ],
            },
            {
                "name": "Capacitance",
                "subtopics": [
                    _s("Parallel Plate Capacitor", 5, 20, [MCQ, NUM], ["C = ε₀A/d", "Effect of dielectric"]),
                    _s("Capacitors in Series and Parallel", 5, 20, [MCQ, NUM, INT], ["Equivalent capacitance circuits"]),
                    _s("Energy Stored in Capacitor", 4, 15, [MCQ, NUM], ["U = ½CV²", "Energy with/without battery"]),
                    _s("Dielectrics and Polarization", 4, 20, [MCQ, NUM], ["Partial dielectric insertion", "Force on dielectric slab"]),
                    _s("Capacitor Circuits with Switches", 4, 20, [MCQ, NUM, INT], ["Charge redistribution", "Capacitor with battery disconnected"]),
                ],
            },
        ],
    },
    {
        "name": "Current Electricity",
        "class_year": 12,
        "jee_weightage_pct": 6.0,
        "topics": [
            {
                "name": "DC Circuits",
                "subtopics": [
                    _s("Ohm's Law and Resistance", 3, 10, [MCQ, NUM]),
                    _s("Resistivity and Temperature Dependence", 3, 15, [MCQ, NUM]),
                    _s("Series and Parallel Resistor Combinations", 4, 15, [MCQ, NUM, INT], ["Equivalent resistance of networks"]),
                    _s("Kirchhoff's Laws (KCL and KVL)", 5, 25, [MCQ, NUM, INT], ["Multi-loop circuits", "Sign convention"]),
                    _s("Wheatstone Bridge and Meter Bridge", 4, 20, [MCQ, NUM], ["Balanced bridge condition", "Sensitivity"]),
                    _s("Potentiometer", 4, 20, [MCQ, NUM], ["EMF comparison", "Internal resistance measurement"]),
                    _s("RC Circuits (Charging and Discharging)", 4, 20, [MCQ, NUM], ["Time constant τ = RC", "Charge and current vs time"]),
                    _s("Electrical Power and Energy", 3, 10, [MCQ, NUM], ["Maximum power transfer"]),
                ],
            },
        ],
    },
    {
        "name": "Moving Charges and Magnetism",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Magnetic Force and Field",
                "subtopics": [
                    _s("Force on Moving Charge in Magnetic Field", 5, 20, [MCQ, NUM], ["F = qv × B", "Circular motion in B field"]),
                    _s("Motion of Charged Particle in Uniform B", 5, 25, [MCQ, NUM, INT], ["Radius, time period, helical motion"]),
                    _s("Cyclotron", 3, 15, [MCQ, NUM], ["Principle and frequency"]),
                    _s("Force on Current-Carrying Conductor", 4, 15, [MCQ, NUM], ["F = iL × B"]),
                    _s("Torque on Current Loop (Magnetic Dipole)", 4, 15, [MCQ, NUM], ["τ = M × B", "Potential energy"]),
                ],
            },
            {
                "name": "Sources of Magnetic Field",
                "subtopics": [
                    _s("Biot-Savart Law", 4, 20, [MCQ, NUM], ["Field due to finite/infinite wire", "Field at center of arc/loop"]),
                    _s("Ampere's Circuital Law", 4, 20, [MCQ, NUM], ["Field of solenoid, toroid", "Thick wire"]),
                    _s("Force Between Parallel Current-Carrying Wires", 3, 15, [MCQ, NUM]),
                    _s("Magnetic Field of Circular Loop", 4, 15, [MCQ, NUM], ["Axial field of loop"]),
                ],
            },
        ],
    },
    {
        "name": "Magnetism and Matter",
        "class_year": 12,
        "jee_weightage_pct": 1.5,
        "topics": [
            {
                "name": "Magnetism",
                "subtopics": [
                    _s("Bar Magnet as Magnetic Dipole", 2, 10, [MCQ]),
                    _s("Magnetic Properties: Dia, Para, Ferromagnetism", 3, 15, [MCQ], ["Susceptibility and permeability"]),
                    _s("Earth's Magnetism", 2, 10, [MCQ]),
                    _s("Hysteresis Curve", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Electromagnetic Induction",
        "class_year": 12,
        "jee_weightage_pct": 5.5,
        "topics": [
            {
                "name": "Faraday's Laws and Lenz's Law",
                "subtopics": [
                    _s("Magnetic Flux and Faraday's Law", 5, 20, [MCQ, NUM, INT], ["EMF from changing flux", "Moving rod in B field"]),
                    _s("Lenz's Law and Direction of Induced EMF", 4, 15, [MCQ], ["Opposition to change in flux"]),
                    _s("Motional EMF", 5, 25, [MCQ, NUM, INT], ["Rod sliding on rails", "Rotating rod in B field"]),
                    _s("Self-Inductance and Mutual Inductance", 4, 20, [MCQ, NUM], ["L of solenoid", "Energy stored = ½LI²"]),
                    _s("Eddy Currents", 2, 10, [MCQ]),
                    _s("LR Circuits (Growth and Decay of Current)", 4, 20, [MCQ, NUM], ["Time constant τ = L/R"]),
                ],
            },
        ],
    },
    {
        "name": "Alternating Current",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "AC Circuits",
                "subtopics": [
                    _s("AC Voltage and Current (RMS and Peak Values)", 3, 15, [MCQ, NUM]),
                    _s("Phasor Diagrams", 4, 15, [MCQ], ["Phase relationships in R, L, C"]),
                    _s("AC Through R, L, C (Individual)", 3, 15, [MCQ, NUM]),
                    _s("Series LCR Circuit and Resonance", 5, 25, [MCQ, NUM, INT], ["Impedance, phase angle", "Resonant frequency", "Q-factor"]),
                    _s("Power in AC Circuits (Power Factor)", 4, 15, [MCQ, NUM], ["P = VIcosφ", "Wattless current"]),
                    _s("Transformers", 3, 15, [MCQ, NUM], ["Step-up/step-down", "Efficiency"]),
                ],
            },
        ],
    },
    {
        "name": "Electromagnetic Waves",
        "class_year": 12,
        "jee_weightage_pct": 1.5,
        "topics": [
            {
                "name": "EM Waves",
                "subtopics": [
                    _s("Displacement Current and Maxwell's Equations", 3, 15, [MCQ]),
                    _s("EM Spectrum and Properties", 3, 10, [MCQ], ["Wavelength ranges", "Uses of each type"]),
                    _s("Energy and Momentum of EM Waves", 2, 10, [MCQ, NUM], ["Poynting vector"]),
                ],
            },
        ],
    },
    {
        "name": "Ray Optics and Optical Instruments",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Reflection and Refraction",
                "subtopics": [
                    _s("Reflection at Plane and Spherical Mirrors", 4, 20, [MCQ, NUM], ["Mirror formula", "Multiple reflections"]),
                    _s("Refraction at Plane Surface and Snell's Law", 3, 15, [MCQ, NUM]),
                    _s("Total Internal Reflection and Critical Angle", 4, 15, [MCQ, NUM], ["Optical fiber", "Diamond sparkle"]),
                    _s("Refraction at Spherical Surfaces", 4, 20, [MCQ, NUM], ["Single surface formula"]),
                    _s("Thin Lens Formula and Lensmaker's Equation", 5, 20, [MCQ, NUM, INT], ["Combination of lenses", "Power of lens"]),
                    _s("Prism — Deviation and Dispersion", 4, 20, [MCQ, NUM], ["Minimum deviation", "Dispersive power"]),
                ],
            },
            {
                "name": "Optical Instruments",
                "subtopics": [
                    _s("Microscope (Simple and Compound)", 3, 15, [MCQ, NUM], ["Magnifying power"]),
                    _s("Telescope (Refracting and Reflecting)", 3, 15, [MCQ, NUM], ["Angular magnification"]),
                ],
            },
        ],
    },
    {
        "name": "Wave Optics",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Interference and Diffraction",
                "subtopics": [
                    _s("Huygens' Principle", 2, 10, [MCQ]),
                    _s("Young's Double Slit Experiment (YDSE)", 5, 25, [MCQ, NUM, INT], ["Fringe width", "Path difference conditions", "YDSE with glass slab", "Intensity distribution"]),
                    _s("Interference in Thin Films", 3, 15, [MCQ, NUM], ["Reflected light fringes"]),
                    _s("Single Slit Diffraction", 4, 20, [MCQ, NUM], ["Central maximum width", "Minima conditions"]),
                    _s("Polarization", 3, 15, [MCQ], ["Brewster's angle", "Malus's law"]),
                ],
            },
        ],
    },
    {
        "name": "Dual Nature of Radiation and Matter",
        "class_year": 12,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Photoelectric Effect",
                "subtopics": [
                    _s("Photoelectric Effect and Einstein's Equation", 5, 20, [MCQ, NUM, INT], ["KEmax = hν - φ", "Threshold frequency/wavelength"]),
                    _s("Stopping Potential and Saturation Current", 4, 15, [MCQ, NUM], ["V₀ vs frequency graph"]),
                    _s("de Broglie Wavelength", 4, 15, [MCQ, NUM], ["λ = h/mv", "Wavelength of accelerated electron"]),
                ],
            },
        ],
    },
    {
        "name": "Atoms",
        "class_year": 12,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Atomic Structure",
                "subtopics": [
                    _s("Bohr's Model of Hydrogen Atom", 5, 25, [MCQ, NUM, INT], ["Energy levels", "Radius and velocity of nth orbit", "Spectral series"]),
                    _s("Hydrogen Spectrum (Lyman, Balmer, etc.)", 4, 15, [MCQ, NUM], ["Wavelength of emitted photon"]),
                    _s("X-Ray Production and Moseley's Law", 3, 15, [MCQ, NUM], ["Characteristic vs continuous X-rays"]),
                ],
            },
        ],
    },
    {
        "name": "Nuclei",
        "class_year": 12,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Nuclear Physics",
                "subtopics": [
                    _s("Nuclear Size, Mass and Binding Energy", 3, 15, [MCQ, NUM], ["BE per nucleon curve"]),
                    _s("Radioactive Decay (α, β, γ)", 4, 20, [MCQ, NUM, INT], ["Decay law N = N₀e^(-λt)", "Half-life and activity"]),
                    _s("Nuclear Fission and Fusion", 3, 15, [MCQ, NUM], ["Energy released calculations"]),
                    _s("Mass-Energy Equivalence (E = mc²)", 3, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Semiconductor Electronics",
        "class_year": 12,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Semiconductors and Devices",
                "subtopics": [
                    _s("Intrinsic and Extrinsic Semiconductors", 2, 10, [MCQ]),
                    _s("p-n Junction Diode", 3, 15, [MCQ], ["Forward/reverse bias", "V-I characteristics"]),
                    _s("Diode as Rectifier (Half-Wave, Full-Wave)", 3, 15, [MCQ]),
                    _s("Zener Diode as Voltage Regulator", 3, 10, [MCQ, NUM]),
                    _s("Transistor (NPN, PNP) and Characteristics", 3, 15, [MCQ, NUM], ["Current gain α, β"]),
                    _s("Logic Gates (AND, OR, NOT, NAND, NOR)", 3, 15, [MCQ], ["Truth tables", "Boolean expressions"]),
                ],
            },
        ],
    },
]

# ═══════════════════════════════════════════════════════════════════════════════
#  CHEMISTRY
# ═══════════════════════════════════════════════════════════════════════════════

CHEMISTRY_CHAPTERS = [
    # ── PHYSICAL CHEMISTRY ────────────────────────────────────────────────────
    {
        "name": "Some Basic Concepts of Chemistry",
        "class_year": 11,
        "jee_weightage_pct": 2.5,
        "topics": [
            {
                "name": "Stoichiometry and Mole Concept",
                "subtopics": [
                    _s("Mole Concept and Avogadro's Number", 4, 15, [MCQ, NUM], ["Mole calculations", "Number of atoms/molecules"]),
                    _s("Percentage Composition and Empirical/Molecular Formula", 3, 15, [MCQ, NUM]),
                    _s("Stoichiometry and Limiting Reagent", 5, 20, [MCQ, NUM, INT], ["Excess reagent calculations", "Yield problems"]),
                    _s("Concentration Terms (Molarity, Molality, Mole Fraction)", 4, 15, [MCQ, NUM], ["Interconversion of concentration terms"]),
                    _s("Equivalent Weight and Normality", 4, 20, [MCQ, NUM], ["n-factor calculations"]),
                ],
            },
        ],
    },
    {
        "name": "Structure of Atom",
        "class_year": 11,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Atomic Structure",
                "subtopics": [
                    _s("Bohr's Model and Hydrogen Spectrum", 4, 20, [MCQ, NUM], ["Energy of nth orbit", "Spectral transitions"]),
                    _s("Quantum Numbers and Orbitals", 4, 20, [MCQ], ["Allowed sets of quantum numbers", "Shape of orbitals"]),
                    _s("Electronic Configuration and Aufbau Principle", 4, 15, [MCQ], ["Exceptions: Cr, Cu", "Stability of half-filled/full-filled"]),
                    _s("de Broglie and Heisenberg Uncertainty", 3, 15, [MCQ, NUM], ["Wavelength calculations", "Uncertainty in position/momentum"]),
                    _s("Photoelectric Effect (Chemistry Perspective)", 3, 15, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Classification of Elements and Periodicity",
        "class_year": 11,
        "jee_weightage_pct": 2.5,
        "topics": [
            {
                "name": "Periodic Properties",
                "subtopics": [
                    _s("Periodic Trends in Atomic/Ionic Radius", 3, 15, [MCQ], ["Across period and down group"]),
                    _s("Ionization Energy Trends and Exceptions", 4, 15, [MCQ], ["IE₁ < IE₂ < IE₃", "Anomalies: B < Be, O < N"]),
                    _s("Electron Affinity and Electronegativity", 3, 15, [MCQ], ["Pauling vs Mulliken scale"]),
                    _s("Effective Nuclear Charge and Shielding", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Chemical Bonding and Molecular Structure",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Bonding Theories",
                "subtopics": [
                    _s("Lewis Structures and Octet Rule", 3, 15, [MCQ], ["Formal charge minimization"]),
                    _s("VSEPR Theory and Molecular Geometry", 5, 25, [MCQ], ["Predicting shapes", "Effect of lone pairs"]),
                    _s("Valence Bond Theory and Hybridization", 5, 25, [MCQ], ["sp, sp2, sp3, sp3d, sp3d2", "Steric number method"]),
                    _s("Molecular Orbital Theory (MOT)", 5, 25, [MCQ, INT], ["MO diagrams for O₂, N₂, NO", "Bond order calculation"]),
                    _s("Dipole Moment and Polarity", 3, 15, [MCQ, NUM], ["Resultant dipole of molecules"]),
                    _s("Hydrogen Bonding and Van der Waals Forces", 3, 15, [MCQ], ["Boiling point trends"]),
                    _s("Ionic Character and Fajan's Rules", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "States of Matter (Gases and Liquids)",
        "class_year": 11,
        "jee_weightage_pct": 2.5,
        "topics": [
            {
                "name": "Gas Laws",
                "subtopics": [
                    _s("Ideal Gas Equation and Gas Laws", 4, 15, [MCQ, NUM], ["Boyle's, Charles', Avogadro's"]),
                    _s("Graham's Law of Diffusion", 3, 15, [MCQ, NUM], ["Rate ratio problems"]),
                    _s("Real Gases and Van der Waals Equation", 3, 15, [MCQ, NUM], ["Compressibility factor Z"]),
                    _s("Critical Constants and Liquefaction", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Chemical Thermodynamics",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Thermochemistry",
                "subtopics": [
                    _s("Enthalpy and Hess's Law", 5, 25, [MCQ, NUM, INT], ["Enthalpy of reaction from bond/formation enthalpies"]),
                    _s("Bond Enthalpy and Lattice Energy (Born-Haber Cycle)", 4, 20, [MCQ, NUM], ["Born-Haber cycle for ionic compounds"]),
                    _s("Entropy and Spontaneity (ΔG = ΔH - TΔS)", 5, 20, [MCQ, NUM], ["Predicting spontaneity at different temperatures"]),
                    _s("Standard Enthalpies (Formation, Combustion, Atomization)", 4, 15, [MCQ, NUM]),
                    _s("Kirchhoff's Equation (ΔH variation with T)", 3, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Equilibrium",
        "class_year": 11,
        "jee_weightage_pct": 6.0,
        "topics": [
            {
                "name": "Chemical Equilibrium",
                "subtopics": [
                    _s("Equilibrium Constant (Kp, Kc) and Le Chatelier's Principle", 5, 25, [MCQ, NUM, INT], ["Effect of pressure, temperature, concentration"]),
                    _s("Relation Between Kp and Kc", 3, 10, [MCQ, NUM]),
                    _s("Degree of Dissociation and Vapour Density", 4, 20, [MCQ, NUM], ["α from Kp"]),
                ],
            },
            {
                "name": "Ionic Equilibrium",
                "subtopics": [
                    _s("Acids, Bases and pH Scale", 4, 15, [MCQ, NUM], ["pH calculations for strong/weak acids"]),
                    _s("Buffer Solutions and Henderson-Hasselbalch Equation", 5, 20, [MCQ, NUM, INT], ["Buffer capacity", "Buffer pH calculation"]),
                    _s("Solubility Product (Ksp) and Common Ion Effect", 5, 20, [MCQ, NUM, INT], ["Precipitation conditions", "Selective precipitation"]),
                    _s("Hydrolysis of Salts", 3, 15, [MCQ, NUM], ["pH of salt solutions"]),
                    _s("Indicators and Titration Curves", 3, 15, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Redox Reactions",
        "class_year": 11,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Oxidation-Reduction",
                "subtopics": [
                    _s("Oxidation Number and Redox Balancing", 4, 15, [MCQ], ["Oxidation state rules and exceptions"]),
                    _s("Balancing Redox Equations (Ion-Electron Method)", 4, 20, [MCQ], ["Half-reaction method in acidic/basic medium"]),
                    _s("Disproportionation and Comproportionation", 3, 10, [MCQ]),
                    _s("Equivalent Weight in Redox (n-factor)", 4, 15, [MCQ, NUM], ["n-factor for various reactions"]),
                ],
            },
        ],
    },
    {
        "name": "Solutions",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Colligative Properties",
                "subtopics": [
                    _s("Raoult's Law and Ideal Solutions", 4, 20, [MCQ, NUM], ["Positive/negative deviations"]),
                    _s("Relative Lowering of Vapour Pressure", 3, 15, [MCQ, NUM]),
                    _s("Elevation in Boiling Point and Depression in Freezing Point", 5, 20, [MCQ, NUM, INT], ["ΔTb = Kb × m", "van't Hoff factor"]),
                    _s("Osmotic Pressure", 4, 15, [MCQ, NUM], ["π = iCRT"]),
                    _s("Abnormal Molecular Mass (van't Hoff Factor)", 4, 15, [MCQ, NUM], ["Association and dissociation"]),
                ],
            },
        ],
    },
    {
        "name": "Electrochemistry",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Electrochemical Cells",
                "subtopics": [
                    _s("Galvanic Cells and Cell Notation", 4, 15, [MCQ, NUM]),
                    _s("Standard Electrode Potential and Electrochemical Series", 4, 15, [MCQ], ["Predicting cell reaction feasibility"]),
                    _s("Nernst Equation", 5, 20, [MCQ, NUM, INT], ["EMF at non-standard conditions", "Concentration cells"]),
                    _s("Electrolysis and Faraday's Laws", 5, 20, [MCQ, NUM, INT], ["Mass deposited calculations", "Current efficiency"]),
                    _s("Conductance and Kohlrausch's Law", 4, 15, [MCQ, NUM], ["Λm at infinite dilution"]),
                ],
            },
        ],
    },
    {
        "name": "Chemical Kinetics",
        "class_year": 12,
        "jee_weightage_pct": 4.5,
        "topics": [
            {
                "name": "Reaction Kinetics",
                "subtopics": [
                    _s("Rate of Reaction and Rate Law", 4, 15, [MCQ, NUM], ["Order from rate data"]),
                    _s("Integrated Rate Laws (Zero, First, Second Order)", 5, 25, [MCQ, NUM, INT], ["Half-life formulas", "Graphical determination of order"]),
                    _s("Arrhenius Equation and Activation Energy", 5, 20, [MCQ, NUM, INT], ["Effect of temperature on rate", "Ea from two-temperature data"]),
                    _s("Pseudo First-Order Reactions", 3, 10, [MCQ, NUM]),
                    _s("Mechanism and Rate-Determining Step", 3, 15, [MCQ], ["Deriving rate law from mechanism"]),
                ],
            },
        ],
    },
    {
        "name": "Surface Chemistry",
        "class_year": 12,
        "jee_weightage_pct": 2.0,
        "topics": [
            {
                "name": "Adsorption and Colloids",
                "subtopics": [
                    _s("Adsorption (Physisorption vs Chemisorption)", 3, 10, [MCQ]),
                    _s("Freundlich and Langmuir Isotherms", 3, 10, [MCQ]),
                    _s("Colloids — Classification and Properties", 3, 15, [MCQ], ["Tyndall effect", "Electrophoresis"]),
                    _s("Emulsions and Micelles", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    # ── INORGANIC CHEMISTRY ───────────────────────────────────────────────────
    {
        "name": "Hydrogen",
        "class_year": 11,
        "jee_weightage_pct": 1.0,
        "topics": [
            {
                "name": "Chemistry of Hydrogen",
                "subtopics": [
                    _s("Position of Hydrogen and Isotopes", 1, 5, [MCQ]),
                    _s("Types of Hydrides", 2, 10, [MCQ]),
                    _s("Water — Structure and Properties", 2, 10, [MCQ]),
                    _s("Hydrogen Peroxide — Structure and Reactions", 3, 15, [MCQ], ["Oxidizing and reducing nature"]),
                ],
            },
        ],
    },
    {
        "name": "s-Block Elements",
        "class_year": 11,
        "jee_weightage_pct": 2.5,
        "topics": [
            {
                "name": "Alkali and Alkaline Earth Metals",
                "subtopics": [
                    _s("General Properties of Group 1 (Alkali Metals)", 3, 15, [MCQ]),
                    _s("General Properties of Group 2 (Alkaline Earth Metals)", 3, 15, [MCQ]),
                    _s("Anomalous Behaviour of Li and Be (Diagonal Relationship)", 3, 10, [MCQ]),
                    _s("Important Compounds: NaOH, Na₂CO₃, CaO, Ca(OH)₂", 3, 15, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "p-Block Elements (Groups 13-14)",
        "class_year": 11,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Group 13 (Boron Family)",
                "subtopics": [
                    _s("General Properties and Anomalous Behaviour of Boron", 3, 15, [MCQ]),
                    _s("Borax, Boric Acid and Boron Hydrides (Diborane)", 3, 15, [MCQ], ["Banana bonds in B₂H₆"]),
                    _s("Aluminium — Amphoteric Nature and Compounds", 3, 10, [MCQ]),
                ],
            },
            {
                "name": "Group 14 (Carbon Family)",
                "subtopics": [
                    _s("Allotropes of Carbon", 2, 10, [MCQ]),
                    _s("Silicon and its Compounds (Silicones, Silicates, Zeolites)", 3, 15, [MCQ]),
                    _s("Oxides of Carbon (CO and CO₂)", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "p-Block Elements (Groups 15-18)",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Group 15 (Nitrogen Family)",
                "subtopics": [
                    _s("Nitrogen — Oxides, Oxyacids", 4, 20, [MCQ], ["Structures of oxides/oxyacids"]),
                    _s("Ammonia and its Properties", 3, 10, [MCQ]),
                    _s("Phosphorus — Allotropes and Oxyacids", 4, 20, [MCQ], ["Structures of H₃PO₄, H₃PO₃"]),
                ],
            },
            {
                "name": "Group 16 (Oxygen Family)",
                "subtopics": [
                    _s("Ozone — Structure and Reactions", 3, 10, [MCQ]),
                    _s("Sulphur — Allotropes and Oxides", 3, 10, [MCQ]),
                    _s("Sulphuric Acid — Contact Process and Properties", 4, 15, [MCQ], ["Oxidizing and dehydrating agent"]),
                    _s("Oxyacids of Sulphur", 3, 15, [MCQ], ["Structures and basicity"]),
                ],
            },
            {
                "name": "Group 17 (Halogens)",
                "subtopics": [
                    _s("Halogen Properties and Trends", 3, 15, [MCQ]),
                    _s("Interhalogen Compounds", 3, 15, [MCQ], ["Structures and hybridization"]),
                    _s("Oxyacids of Halogens", 4, 15, [MCQ], ["Acidic strength order", "Oxidizing power"]),
                    _s("Hydrogen Halides — Properties and Trends", 3, 10, [MCQ]),
                ],
            },
            {
                "name": "Group 18 (Noble Gases)",
                "subtopics": [
                    _s("Xenon Compounds — XeF₂, XeF₄, XeF₆", 3, 15, [MCQ], ["Structures and hybridization"]),
                ],
            },
        ],
    },
    {
        "name": "d-Block and f-Block Elements",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Transition Elements",
                "subtopics": [
                    _s("General Properties of Transition Metals", 3, 15, [MCQ], ["Variable oxidation states", "Colour, catalytic activity"]),
                    _s("Electronic Configuration of 3d Series", 3, 10, [MCQ], ["Exceptions: Cr, Cu"]),
                    _s("Ionization Energy and Oxidation State Trends", 3, 15, [MCQ]),
                    _s("Important Compounds: KMnO₄ and K₂Cr₂O₇", 4, 20, [MCQ], ["Preparation, properties, structures"]),
                    _s("Lanthanide Contraction", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Coordination Compounds",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Coordination Chemistry",
                "subtopics": [
                    _s("Werner's Theory and IUPAC Nomenclature", 4, 20, [MCQ], ["Naming complex compounds"]),
                    _s("Coordination Number and Isomerism", 5, 25, [MCQ], ["Geometric and optical isomers", "Linkage and ionization isomerism"]),
                    _s("Valence Bond Theory for Complexes", 3, 15, [MCQ], ["Inner vs outer orbital complexes"]),
                    _s("Crystal Field Theory (CFT)", 5, 25, [MCQ, INT], ["CFSE calculations", "Spectrochemical series", "High spin vs low spin"]),
                    _s("Magnetic Properties and Colour of Complexes", 3, 10, [MCQ], ["Spin-only magnetic moment"]),
                    _s("Stability Constants of Complexes", 3, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Metallurgy",
        "class_year": 12,
        "jee_weightage_pct": 2.0,
        "topics": [
            {
                "name": "Extraction of Metals",
                "subtopics": [
                    _s("Thermodynamic Principles (Ellingham Diagram)", 3, 15, [MCQ], ["Which metal reduces which oxide"]),
                    _s("Extraction of Iron, Copper, Zinc, Aluminium", 3, 15, [MCQ]),
                    _s("Refining Methods (Electrolytic, Zone, Vapour Phase)", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Qualitative Inorganic Analysis",
        "class_year": 12,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Salt Analysis",
                "subtopics": [
                    _s("Cation Analysis (Group Reagents and Confirmatory Tests)", 4, 20, [MCQ], ["Systematic group analysis"]),
                    _s("Anion Analysis (Preliminary and Confirmatory)", 4, 20, [MCQ]),
                    _s("Flame Tests and Borax Bead Tests", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    # ── ORGANIC CHEMISTRY ─────────────────────────────────────────────────────
    {
        "name": "Organic Chemistry — Basic Principles",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "IUPAC and Structural Concepts",
                "subtopics": [
                    _s("IUPAC Nomenclature of Organic Compounds", 4, 20, [MCQ], ["Naming branched and polyfunctional molecules"]),
                    _s("Isomerism — Structural and Stereoisomerism", 5, 25, [MCQ], ["Chain, position, functional, metamerism"]),
                    _s("Inductive, Resonance and Hyperconjugation Effects", 5, 25, [MCQ], ["+I/-I effects on acidity/basicity", "Resonance structures and stability"]),
                    _s("Carbocation, Carbanion and Free Radical Stability", 5, 20, [MCQ], ["Stability order with reasoning"]),
                    _s("Electrophilic and Nucleophilic Reagents", 3, 15, [MCQ]),
                    _s("Types of Organic Reactions (Addition, Substitution, Elimination)", 4, 15, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Hydrocarbons",
        "class_year": 11,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Alkanes, Alkenes, Alkynes",
                "subtopics": [
                    _s("Alkanes — Preparation and Properties", 2, 15, [MCQ]),
                    _s("Alkenes — Addition Reactions (Markovnikov, Anti-Markovnikov)", 4, 20, [MCQ], ["HBr with peroxide", "Electrophilic addition mechanism"]),
                    _s("Alkynes — Preparation and Reactions", 3, 15, [MCQ]),
                    _s("Conformational Analysis (Ethane, Butane)", 3, 15, [MCQ], ["Newman projections", "Sawhorse projections"]),
                ],
            },
            {
                "name": "Aromatic Hydrocarbons",
                "subtopics": [
                    _s("Benzene — Aromaticity and Hückel's Rule", 4, 15, [MCQ]),
                    _s("Electrophilic Aromatic Substitution (EAS)", 5, 25, [MCQ], ["Halogenation, nitration, Friedel-Crafts", "Directing effects of substituents"]),
                    _s("Activating and Deactivating Groups (ortho/para/meta directors)", 5, 20, [MCQ], ["Predicting major product"]),
                ],
            },
        ],
    },
    {
        "name": "Haloalkanes and Haloarenes",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Halogenated Compounds",
                "subtopics": [
                    _s("SN1 and SN2 Mechanisms", 5, 25, [MCQ], ["Stereochemistry: inversion vs racemization", "Substrate, nucleophile, solvent effects"]),
                    _s("E1 and E2 Elimination Reactions", 5, 25, [MCQ], ["Zaitsev's rule", "Competition between SN and E"]),
                    _s("Haloarenes — Nucleophilic Substitution (Benzyne Mechanism)", 3, 15, [MCQ]),
                    _s("Grignard Reagent and Organometallic Reactions", 4, 20, [MCQ], ["Reactions with aldehydes, ketones, CO₂, epoxides"]),
                ],
            },
        ],
    },
    {
        "name": "Alcohols, Phenols and Ethers",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Alcohols and Phenols",
                "subtopics": [
                    _s("Preparation of Alcohols (Hydration, Reduction, Grignard)", 3, 15, [MCQ]),
                    _s("Reactions of Alcohols (Dehydration, Oxidation, Esterification)", 4, 20, [MCQ], ["Lucas test", "PCC vs KMnO₄ oxidation"]),
                    _s("Phenol — Acidity, Kolbe's, Reimer-Tiemann, Fries Rearrangement", 4, 20, [MCQ], ["Named reactions flowchart"]),
                    _s("Ethers — Williamson Synthesis and Reactions", 3, 15, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Aldehydes, Ketones and Carboxylic Acids",
        "class_year": 12,
        "jee_weightage_pct": 6.0,
        "topics": [
            {
                "name": "Carbonyl Compounds",
                "subtopics": [
                    _s("Nucleophilic Addition Reactions of Aldehydes/Ketones", 5, 25, [MCQ], ["HCN, NH₃ derivatives, Grignard"]),
                    _s("Aldol Condensation and Cannizzaro Reaction", 5, 25, [MCQ], ["Cross aldol", "Intramolecular aldol"]),
                    _s("Wittig, Clemmensen, Wolff-Kishner Reductions", 4, 15, [MCQ]),
                    _s("Distinction Tests (Tollens', Fehling's, Iodoform)", 4, 15, [MCQ], ["Identifying aldehydes vs ketones"]),
                ],
            },
            {
                "name": "Carboxylic Acids",
                "subtopics": [
                    _s("Acidity of Carboxylic Acids (Substituent Effects)", 4, 15, [MCQ], ["Acidity order with reasoning"]),
                    _s("Reactions of Carboxylic Acids (Hell-Volhard-Zelinsky, Decarboxylation)", 4, 20, [MCQ]),
                    _s("Carboxylic Acid Derivatives (Esters, Acid Chlorides, Anhydrides)", 4, 20, [MCQ], ["Relative reactivity order"]),
                ],
            },
        ],
    },
    {
        "name": "Amines",
        "class_year": 12,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Chemistry of Amines",
                "subtopics": [
                    _s("Classification and Basicity of Amines", 4, 15, [MCQ], ["Basicity order in gas vs solution"]),
                    _s("Preparation of Amines (Gabriel, Hoffmann Bromamide)", 4, 15, [MCQ]),
                    _s("Reactions of Amines (Diazotization, Coupling)", 4, 20, [MCQ], ["Diazonium salt reactions"]),
                    _s("Distinction Between Primary, Secondary, Tertiary Amines", 3, 15, [MCQ], ["Hinsberg's test", "Carbylamine test"]),
                ],
            },
        ],
    },
    {
        "name": "Biomolecules",
        "class_year": 12,
        "jee_weightage_pct": 2.0,
        "topics": [
            {
                "name": "Biological Molecules",
                "subtopics": [
                    _s("Carbohydrates — Mono, Di, Polysaccharides", 3, 15, [MCQ], ["D/L configuration", "Anomers"]),
                    _s("Amino Acids and Proteins", 3, 15, [MCQ], ["Zwitter ion", "Peptide bond"]),
                    _s("Nucleic Acids (DNA and RNA)", 2, 10, [MCQ]),
                    _s("Enzymes and Vitamins", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Polymers",
        "class_year": 12,
        "jee_weightage_pct": 1.5,
        "topics": [
            {
                "name": "Polymer Chemistry",
                "subtopics": [
                    _s("Addition and Condensation Polymerization", 3, 15, [MCQ], ["Monomer identification"]),
                    _s("Natural and Synthetic Polymers", 3, 15, [MCQ], ["Nylon, Bakelite, Teflon, PVC"]),
                    _s("Rubber — Natural and Synthetic", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Chemistry in Everyday Life",
        "class_year": 12,
        "jee_weightage_pct": 1.0,
        "topics": [
            {
                "name": "Applied Chemistry",
                "subtopics": [
                    _s("Drugs — Classification and Mechanism", 2, 10, [MCQ]),
                    _s("Soaps and Detergents", 2, 10, [MCQ]),
                ],
            },
        ],
    },
]

# ═══════════════════════════════════════════════════════════════════════════════
#  MATHEMATICS
# ═══════════════════════════════════════════════════════════════════════════════

MATHEMATICS_CHAPTERS = [
    # ── CLASS 11 ──────────────────────────────────────────────────────────────
    {
        "name": "Sets, Relations and Functions",
        "class_year": 11,
        "jee_weightage_pct": 3.0,
        "topics": [
            {
                "name": "Sets",
                "subtopics": [
                    _s("Types of Sets and Set Operations (Union, Intersection, Complement)", 3, 15, [MCQ, INT]),
                    _s("Venn Diagrams and Applications", 3, 15, [MCQ, INT], ["n(A∪B) formula problems"]),
                    _s("Power Set and Cartesian Product", 2, 10, [MCQ, INT]),
                ],
            },
            {
                "name": "Relations and Functions",
                "subtopics": [
                    _s("Types of Relations (Reflexive, Symmetric, Transitive, Equivalence)", 4, 20, [MCQ], ["Checking properties from matrix/set"]),
                    _s("Types of Functions (Injective, Surjective, Bijective)", 4, 20, [MCQ, INT], ["Number of onto functions"]),
                    _s("Domain, Range and Graphs of Functions", 4, 20, [MCQ], ["Finding domain/range of composite functions"]),
                    _s("Composition of Functions and Invertibility", 4, 15, [MCQ], ["fog, gof problems"]),
                ],
            },
        ],
    },
    {
        "name": "Trigonometric Functions",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Trigonometric Identities and Equations",
                "subtopics": [
                    _s("Trigonometric Ratios and Standard Angles", 2, 10, [MCQ]),
                    _s("Compound Angle Formulas (sin(A±B), cos(A±B))", 5, 20, [MCQ, NUM], ["Simplification problems"]),
                    _s("Multiple and Sub-Multiple Angle Formulas", 4, 15, [MCQ, NUM]),
                    _s("Sum-to-Product and Product-to-Sum Formulas", 3, 15, [MCQ]),
                    _s("Trigonometric Equations — General Solutions", 5, 25, [MCQ, NUM, INT], ["sinx = k, cosx = k, tanx = k", "Number of solutions in interval"]),
                    _s("Inverse Trigonometric Functions — Properties and Identities", 5, 25, [MCQ, NUM], ["Domain/range", "Composition of inverse trig functions"]),
                ],
            },
            {
                "name": "Properties of Triangles",
                "subtopics": [
                    _s("Sine Rule, Cosine Rule and Projection Formula", 4, 20, [MCQ, NUM], ["Side-angle relationships"]),
                    _s("Area of Triangle (Hero's Formula, ½absinC)", 3, 15, [MCQ, NUM]),
                    _s("Circumradius, Inradius and Exradii", 4, 20, [MCQ, NUM, INT], ["R = abc/4Δ", "r = Δ/s formulas"]),
                    _s("Heights and Distances", 3, 15, [MCQ, NUM], ["Angle of elevation/depression"]),
                ],
            },
        ],
    },
    {
        "name": "Complex Numbers",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Algebra of Complex Numbers",
                "subtopics": [
                    _s("Modulus, Argument and Polar Form", 4, 15, [MCQ, NUM], ["z = r(cosθ + isinθ)"]),
                    _s("De Moivre's Theorem and Roots of Unity", 5, 20, [MCQ, NUM, INT], ["nth roots of unity", "Cube roots of unity applications"]),
                    _s("Geometry of Complex Numbers (Rotation, Section Formula)", 5, 25, [MCQ, NUM], ["Locus problems", "Circle and line in Argand plane"]),
                    _s("Complex Number Equations and Minimum/Maximum Modulus", 4, 20, [MCQ, NUM], ["Triangle inequality", "|z₁ + z₂| ≤ |z₁| + |z₂|"]),
                ],
            },
        ],
    },
    {
        "name": "Quadratic Equations",
        "class_year": 11,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Theory of Equations",
                "subtopics": [
                    _s("Discriminant, Nature and Sum/Product of Roots", 4, 15, [MCQ, NUM], ["Vieta's formulas"]),
                    _s("Common Roots and Condition for Common Roots", 4, 15, [MCQ, NUM, INT]),
                    _s("Quadratic Expression — Sign, Maximum and Minimum", 4, 20, [MCQ, NUM], ["Sign of ax²+bx+c for all x"]),
                    _s("Location of Roots (Interval Conditions)", 4, 20, [MCQ], ["Both roots in (a,b)", "Roots on either side of k"]),
                    _s("Higher Degree Equations — Descartes' Rule", 3, 15, [MCQ, INT]),
                ],
            },
        ],
    },
    {
        "name": "Permutations and Combinations",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Counting Principles",
                "subtopics": [
                    _s("Fundamental Counting Principle", 3, 10, [MCQ, INT]),
                    _s("Permutations (nPr) — With and Without Repetition", 4, 20, [MCQ, INT], ["Arrangement with constraints"]),
                    _s("Circular Permutations and Necklace Problems", 4, 15, [MCQ, INT]),
                    _s("Combinations (nCr) and Properties", 4, 15, [MCQ, INT]),
                    _s("Distribution and Derangement Problems", 5, 25, [MCQ, INT], ["Identical/distinct objects into groups"]),
                    _s("Multinomial Theorem and Grouping", 4, 20, [MCQ, INT]),
                ],
            },
        ],
    },
    {
        "name": "Binomial Theorem",
        "class_year": 11,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Binomial Expansion",
                "subtopics": [
                    _s("General Term and Middle Term", 5, 20, [MCQ, NUM, INT], ["Finding coefficient of x^r"]),
                    _s("Binomial Coefficients Properties (ΣnCr, etc.)", 4, 15, [MCQ, INT], ["Sum of coefficients", "Alternating sum"]),
                    _s("Greatest Term and Greatest Coefficient", 3, 15, [MCQ, NUM]),
                    _s("Binomial Theorem for Rational/Negative Index", 3, 15, [MCQ, NUM], ["Approximations using (1+x)^n"]),
                    _s("Remainder and Divisibility Problems Using Binomial", 4, 15, [MCQ, INT], ["Last digit, remainder when divided by n"]),
                ],
            },
        ],
    },
    {
        "name": "Sequences and Series",
        "class_year": 11,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "AP, GP, HP and Special Series",
                "subtopics": [
                    _s("Arithmetic Progression — nth term and Sum", 4, 15, [MCQ, NUM, INT]),
                    _s("Geometric Progression — nth term and Sum", 4, 15, [MCQ, NUM, INT], ["Infinite GP sum"]),
                    _s("Harmonic Progression", 3, 10, [MCQ, NUM]),
                    _s("AM-GM-HM Inequality", 5, 20, [MCQ, NUM, INT], ["Finding min/max using AM ≥ GM"]),
                    _s("Arithmetico-Geometric Progression (AGP)", 4, 20, [MCQ, NUM], ["Sum of AGP"]),
                    _s("Summation of Special Series (Σn², Σn³, Telescoping)", 4, 20, [MCQ, NUM, INT], ["Method of differences", "Vn method"]),
                ],
            },
        ],
    },
    {
        "name": "Straight Lines",
        "class_year": 11,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Coordinate Geometry of Lines",
                "subtopics": [
                    _s("Slope, Intercept and Various Forms of Line Equation", 3, 15, [MCQ, NUM]),
                    _s("Distance of Point from Line and Between Parallel Lines", 4, 15, [MCQ, NUM], ["Perpendicular distance formula"]),
                    _s("Angle Between Two Lines", 3, 10, [MCQ, NUM]),
                    _s("Family of Lines and Concurrent Lines", 4, 15, [MCQ, NUM], ["L₁ + λL₂ = 0 concept"]),
                    _s("Pair of Straight Lines (Homogeneous Equation)", 4, 20, [MCQ, NUM, INT], ["Condition for pair of lines", "Angle between pair"]),
                ],
            },
        ],
    },
    {
        "name": "Conic Sections",
        "class_year": 11,
        "jee_weightage_pct": 7.0,
        "topics": [
            {
                "name": "Circle",
                "subtopics": [
                    _s("Equation of Circle (Standard, General, Parametric)", 4, 15, [MCQ, NUM]),
                    _s("Tangent and Normal to a Circle", 4, 20, [MCQ, NUM], ["Length of tangent", "Condition for tangency"]),
                    _s("Family of Circles and Radical Axis", 4, 20, [MCQ, NUM], ["Common chord", "Radical axis"]),
                    _s("Orthogonal Circles", 3, 15, [MCQ, NUM]),
                ],
            },
            {
                "name": "Parabola",
                "subtopics": [
                    _s("Standard Parabola and its Properties", 4, 20, [MCQ, NUM], ["Vertex, focus, directrix"]),
                    _s("Tangent and Normal to Parabola", 5, 20, [MCQ, NUM, INT], ["Equation of tangent at (at², 2at)"]),
                    _s("Chord of Contact and Pair of Tangents", 4, 15, [MCQ, NUM]),
                ],
            },
            {
                "name": "Ellipse",
                "subtopics": [
                    _s("Standard Ellipse and Eccentricity", 4, 15, [MCQ, NUM]),
                    _s("Tangent, Normal and Focal Chords of Ellipse", 5, 20, [MCQ, NUM], ["Condition for tangency"]),
                    _s("Auxiliary Circle and Eccentric Angle", 3, 15, [MCQ, NUM]),
                ],
            },
            {
                "name": "Hyperbola",
                "subtopics": [
                    _s("Standard Hyperbola and Rectangular Hyperbola", 4, 15, [MCQ, NUM]),
                    _s("Asymptotes and Conjugate Hyperbola", 3, 15, [MCQ, NUM]),
                    _s("Tangent and Normal to Hyperbola", 4, 15, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Mathematical Induction",
        "class_year": 11,
        "jee_weightage_pct": 1.0,
        "topics": [
            {
                "name": "Principle of Mathematical Induction",
                "subtopics": [
                    _s("Weak Induction — Proving Summation and Divisibility", 3, 15, [MCQ], ["Standard PMI proof structure"]),
                    _s("Strong Induction", 2, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Linear Inequalities",
        "class_year": 11,
        "jee_weightage_pct": 1.5,
        "topics": [
            {
                "name": "Inequalities",
                "subtopics": [
                    _s("Solving Linear Inequalities and Systems", 2, 10, [MCQ]),
                    _s("Modulus Inequalities (|x-a| < b)", 4, 15, [MCQ, INT], ["Solving |f(x)| < g(x) type"]),
                    _s("Wavy Curve Method for Polynomial Inequalities", 4, 20, [MCQ], ["Sign analysis of rational functions"]),
                ],
            },
        ],
    },
    {
        "name": "Statistics and Probability (Class 11)",
        "class_year": 11,
        "jee_weightage_pct": 2.0,
        "topics": [
            {
                "name": "Statistics",
                "subtopics": [
                    _s("Mean, Median, Mode for Grouped Data", 3, 15, [MCQ, NUM]),
                    _s("Variance and Standard Deviation", 4, 15, [MCQ, NUM, INT], ["Shortcut formulas", "Effect of adding/multiplying constants"]),
                ],
            },
        ],
    },
    # ── CLASS 12 ──────────────────────────────────────────────────────────────
    {
        "name": "Matrices and Determinants",
        "class_year": 12,
        "jee_weightage_pct": 6.0,
        "topics": [
            {
                "name": "Matrices",
                "subtopics": [
                    _s("Types of Matrices and Matrix Operations", 3, 15, [MCQ]),
                    _s("Matrix Multiplication and Properties", 4, 15, [MCQ, NUM], ["AB ≠ BA in general"]),
                    _s("Transpose, Symmetric and Skew-Symmetric Matrices", 3, 15, [MCQ]),
                    _s("Inverse of a Matrix (Adjoint Method)", 4, 20, [MCQ, NUM]),
                    _s("Elementary Row Operations and Echelon Form", 3, 15, [MCQ]),
                ],
            },
            {
                "name": "Determinants",
                "subtopics": [
                    _s("Determinant Evaluation (Sarrus, Cofactor Expansion)", 4, 15, [MCQ, NUM, INT]),
                    _s("Properties of Determinants", 5, 20, [MCQ, INT], ["Row/column operations to simplify"]),
                    _s("Cramer's Rule and System of Linear Equations", 4, 20, [MCQ, NUM], ["Homogeneous/non-homogeneous systems"]),
                    _s("Area of Triangle Using Determinant", 3, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Continuity and Differentiability",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Limits",
                "subtopics": [
                    _s("Limits — Algebraic, Trigonometric, Exponential Forms", 5, 20, [MCQ, NUM], ["L'Hôpital's rule", "Standard limits"]),
                    _s("Limits Using Expansion (Taylor/Maclaurin)", 4, 15, [MCQ, NUM]),
                    _s("Sandwich Theorem and Indeterminate Forms", 3, 15, [MCQ, NUM]),
                ],
            },
            {
                "name": "Continuity and Differentiability",
                "subtopics": [
                    _s("Continuity at a Point and on an Interval", 4, 15, [MCQ, NUM], ["Finding values for continuity"]),
                    _s("Differentiability — Left and Right Derivatives", 4, 20, [MCQ, NUM], ["Differentiability of |x|, max(f,g)"]),
                    _s("Differentiation Rules (Product, Quotient, Chain)", 3, 15, [MCQ]),
                    _s("Implicit and Parametric Differentiation", 4, 15, [MCQ, NUM]),
                    _s("Logarithmic Differentiation", 3, 10, [MCQ, NUM]),
                    _s("Higher-Order Derivatives and Leibniz Formula", 3, 15, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Applications of Derivatives",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Applications",
                "subtopics": [
                    _s("Tangent and Normal to Curves", 4, 15, [MCQ, NUM], ["Slope, equation of tangent"]),
                    _s("Increasing and Decreasing Functions", 4, 15, [MCQ], ["Interval of monotonicity"]),
                    _s("Maxima and Minima (First and Second Derivative Tests)", 5, 25, [MCQ, NUM, INT], ["Optimization word problems", "Global max/min on closed interval"]),
                    _s("Rolle's Theorem and Lagrange's MVT", 4, 20, [MCQ, NUM], ["Verifying conditions and finding c"]),
                    _s("Rate of Change Problems", 3, 15, [MCQ, NUM]),
                    _s("Approximations Using Differentials", 2, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Integrals",
        "class_year": 12,
        "jee_weightage_pct": 7.0,
        "topics": [
            {
                "name": "Indefinite Integration",
                "subtopics": [
                    _s("Integration by Substitution", 4, 20, [MCQ, NUM]),
                    _s("Integration by Parts (ILATE Rule)", 4, 20, [MCQ, NUM], ["Repeated by-parts", "∫eˣ[f(x)+f'(x)]dx"]),
                    _s("Integration of Rational Functions (Partial Fractions)", 5, 25, [MCQ, NUM], ["Proper vs improper fractions"]),
                    _s("Integration of Trigonometric Functions", 4, 20, [MCQ, NUM], ["∫sin^m x cos^n x dx", "Weierstrass substitution"]),
                    _s("Integration of Irrational Functions", 3, 15, [MCQ, NUM], ["Euler substitutions"]),
                ],
            },
            {
                "name": "Definite Integration",
                "subtopics": [
                    _s("Properties of Definite Integrals", 5, 25, [MCQ, NUM, INT], ["King's property ∫f(a+b-x)", "Even/odd function properties"]),
                    _s("Definite Integrals as Limit of Sum", 3, 15, [MCQ, NUM]),
                    _s("Leibniz Rule (Differentiation Under Integral Sign)", 4, 15, [MCQ, NUM]),
                    _s("Gamma and Beta Function Integrals (Walli's Formula)", 3, 15, [MCQ, NUM], ["∫sin^n x dx from 0 to π/2"]),
                ],
            },
        ],
    },
    {
        "name": "Applications of Integrals",
        "class_year": 12,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Area Under Curves",
                "subtopics": [
                    _s("Area Between Curves", 5, 25, [MCQ, NUM, INT], ["Parabola-line", "Circle-line regions"]),
                    _s("Area Bounded by Standard Curves", 4, 20, [MCQ, NUM], ["Ellipse, parabola, hyperbola areas"]),
                    _s("Area Using Inequalities and Modulus Functions", 3, 15, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Differential Equations",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "ODE Methods",
                "subtopics": [
                    _s("Order and Degree of Differential Equations", 3, 10, [MCQ]),
                    _s("Variable Separable Method", 4, 15, [MCQ, NUM]),
                    _s("Homogeneous Differential Equations", 4, 15, [MCQ, NUM], ["y = vx substitution"]),
                    _s("Linear First-Order DE (Integrating Factor)", 5, 20, [MCQ, NUM, INT], ["dy/dx + Py = Q", "Bernoulli equation"]),
                    _s("Applications of Differential Equations", 3, 15, [MCQ, NUM], ["Growth/decay", "Newton's cooling"]),
                ],
            },
        ],
    },
    {
        "name": "Vector Algebra",
        "class_year": 12,
        "jee_weightage_pct": 3.5,
        "topics": [
            {
                "name": "Vector Operations",
                "subtopics": [
                    _s("Position Vectors and Section Formula", 3, 10, [MCQ, NUM]),
                    _s("Scalar (Dot) Product and Projections", 4, 15, [MCQ, NUM], ["Component of a along b"]),
                    _s("Vector (Cross) Product and Area", 4, 15, [MCQ, NUM], ["Area of parallelogram/triangle"]),
                    _s("Scalar Triple Product and Volume", 4, 15, [MCQ, NUM, INT], ["Coplanarity condition", "Volume of parallelepiped"]),
                    _s("Vector Triple Product", 3, 10, [MCQ, NUM]),
                    _s("Linear Dependence and Coplanarity", 3, 10, [MCQ]),
                ],
            },
        ],
    },
    {
        "name": "Three Dimensional Geometry",
        "class_year": 12,
        "jee_weightage_pct": 4.0,
        "topics": [
            {
                "name": "Lines and Planes in 3D",
                "subtopics": [
                    _s("Direction Cosines and Direction Ratios", 3, 10, [MCQ, NUM]),
                    _s("Equation of Line in 3D (Symmetric, Vector, Parametric)", 4, 15, [MCQ, NUM]),
                    _s("Equation of Plane (Normal, Intercept, Three Points)", 4, 15, [MCQ, NUM]),
                    _s("Angle Between Line and Plane", 3, 10, [MCQ, NUM]),
                    _s("Distance of Point from Plane", 4, 15, [MCQ, NUM, INT]),
                    _s("Shortest Distance Between Skew Lines", 5, 20, [MCQ, NUM, INT], ["Vector method"]),
                    _s("Image of Point and Line in a Plane", 4, 15, [MCQ, NUM]),
                    _s("Family of Planes", 3, 10, [MCQ, NUM]),
                ],
            },
        ],
    },
    {
        "name": "Probability (Advanced)",
        "class_year": 12,
        "jee_weightage_pct": 5.0,
        "topics": [
            {
                "name": "Probability Theory",
                "subtopics": [
                    _s("Conditional Probability and Multiplication Theorem", 4, 15, [MCQ, NUM]),
                    _s("Bayes' Theorem", 5, 20, [MCQ, NUM, INT], ["Disease testing", "Drawing from urns"]),
                    _s("Total Probability Theorem", 4, 15, [MCQ, NUM]),
                    _s("Binomial Distribution (Mean, Variance)", 5, 20, [MCQ, NUM, INT], ["P(X = r) = nCr p^r q^(n-r)"]),
                    _s("Independent and Dependent Events", 3, 15, [MCQ]),
                    _s("Probability Using Combinations (Classical)", 4, 15, [MCQ, INT], ["Card, dice, ball problems"]),
                ],
            },
        ],
    },
]

# ═══════════════════════════════════════════════════════════════════════════════
#  COMPLETE SYLLABUS
# ═══════════════════════════════════════════════════════════════════════════════

SYLLABUS = {
    "Physics": PHYSICS_CHAPTERS,
    "Chemistry": CHEMISTRY_CHAPTERS,
    "Mathematics": MATHEMATICS_CHAPTERS,
}


def get_total_counts():
    """Get total counts for all subjects."""
    counts = {}
    total_subtopics = 0
    for subject_name, chapters in SYLLABUS.items():
        subject_count = 0
        for chapter in chapters:
            for topic in chapter["topics"]:
                subject_count += len(topic["subtopics"])
        counts[subject_name] = subject_count
        total_subtopics += subject_count
    counts["TOTAL"] = total_subtopics
    return counts


if __name__ == "__main__":
    counts = get_total_counts()
    print("NeuralJEE Complete Syllabus Counts:")
    for subject, count in counts.items():
        print(f"  {subject}: {count} subtopics")
