GLOBAL DECISION INDEX (GDI™)
OMNIVERSE PROTOCOL™ (OMS-1) — Index Specification
Version 1.0 — International Formal Edition


---

ABSTRACT

Global Decision Index (GDI™) is a mathematically defined, sovereign-neutral composite index that quantifies the decision capacity, systemic stability, risk exposure, and alignment integrity of complex systems, including nation-states, institutions, and AI-driven architectures.

GDI provides a normalized, comparable, and auditable scoring framework enabling cross-system ranking, longitudinal analysis, and decision-quality benchmarking under OMS-1.


---

1. INDEX DEFINITION

GDI is defined as a bounded scalar function:

GDI ∈ [0,1]

Higher values indicate stronger decision integrity, higher stability, lower systemic risk, and superior alignment.


---

2. CORE FORMULATION

GDI = w₁·DI + w₂·S − w₃·R + w₄·AIA + w₅·SR

Subject to:

∑_{i=1}^{5} w_i = 1
w_i ≥ 0

Where:

DI = Decision Integrity
S = Strategic Stability
R = Systemic Risk
AIA = AI Alignment Assurance
SR = Sovereign Resilience


---

3. DIMENSIONAL STRUCTURE

Each component is normalized:

∀ x ∈ {DI, S, R, AIA, SR},  x ∈ [0,1]


---

3.1 Decision Integrity (DI)

DI = 1 − ε_d

Where:

ε_d = decision error rate under uncertainty


---

3.2 Strategic Stability (S)

S = 1 − Var(S_t)

Where:

Var(S_t) = variance of system stability over time


---

3.3 Systemic Risk (R)

R = ∑_{k=1}^{m} p_k · L_k

Where:

p_k = probability of event k
L_k = loss magnitude


---

3.4 AI Alignment Assurance (AIA)

AIA = 1 − δ_ai

Where:

δ_ai = divergence between AI output and policy constraints


---

3.5 Sovereign Resilience (SR)

SR = (Recovery Capacity) / (Shock Magnitude)

Bounded:

SR ≤ 1


---

4. WEIGHT STRUCTURE

Weights reflect strategic importance:

w₁ + w₂ + w₃ + w₄ + w₅ = 1

Reference configuration (neutral baseline):

w₁ = 0.25
w₂ = 0.25
w₃ = 0.20
w₄ = 0.15
w₅ = 0.15

Weight adjustment condition:

w_i = f(Context, Domain, Temporal Priority)


---

5. NORMALIZATION FUNCTION

Raw inputs mapped to [0,1]:

x_norm = (x − x_min) / (x_max − x_min)

For risk (inverse contribution):

R_eff = 1 − R_norm


---

6. SCORING FUNCTION

Final computation:

GDI = ∑ w_i · x_i

Where:

x_i = normalized dimension values

Constraint:

0 ≤ GDI ≤ 1


---

7. RANKING MODEL

For N systems:

Rank(S_i) = position of GDI_i in descending order

Ordering condition:

GDI₁ ≥ GDI₂ ≥ ... ≥ GDI_N


---

7.1 TIE CONDITION

If:

GDI_i = GDI_j

Then ranking resolved by:

Tie-break = max(DI, S, SR)


---

8. CLASSIFICATION TIERS

Tier I — Sovereign Grade
GDI ≥ 0.80

Tier II — Advanced
0.60 ≤ GDI < 0.80

Tier III — Transitional
0.40 ≤ GDI < 0.60

Tier IV — Fragile
GDI < 0.40


---

9. TEMPORAL DYNAMICS

Time evolution:

GDI(t+1) = GDI(t) + ΔDI + ΔS − ΔR + ΔAIA + ΔSR

Stability condition:

|d(GDI)/dt| ≤ κ

Where:

κ = acceptable volatility threshold


---

10. SENSITIVITY ANALYSIS

Partial derivatives:

∂GDI/∂DI = w₁
∂GDI/∂S = w₂
∂GDI/∂R = −w₃
∂GDI/∂AIA = w₄
∂GDI/∂SR = w₅


---

11. VALIDATION CONDITIONS

A system is valid if:

DI ≥ τ₁
S ≥ τ₂
R ≤ τ₃
AIA ≥ τ₄
SR ≥ τ₅


---

12. COMPUTATIONAL PIPELINE

Input → Normalization → Weighting → Aggregation → Output

Formal mapping:

GDI = F(Normalize(Data), Weights)


---

13. INTERPRETATION

GDI → 1
High integrity, stable, low risk, fully aligned system

GDI → 0
Unstable, high-risk, misaligned system


---

14. STANDARD DECLARATION

Global Decision Index (GDI™) is the official quantitative scoring and ranking mechanism defined under OMNIVERSE PROTOCOL™ (OMS-1).

It establishes a universal, normalized, and mathematically auditable index for evaluating decision systems across sovereign, institutional, and artificial intelligence domains.

GDI serves as the foundational metric for global comparability, certification, and strategic intelligence assessment under the OMNIVERSE standard framework.


---

END OF INDEX 🔒
