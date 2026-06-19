---
title: Scientific Computing
---


Numerical methods + matrix computations.

## Prerequisites

- Calculus (single + multivariable)
- Linear algebra (matrices, vector spaces, eigen-decomposition)
- Basic programming — MATLAB, Octave, Julia, or Python (numpy/scipy)
- Familiarity with floating-point representation (IEEE 754)

## Learning path

1. **Error analysis** — know the limits of finite precision *before* trusting any answer
2. **Linear systems** — direct solvers (LU, QR), then iterative (Jacobi, GS, SOR, CG)
3. **Interpolation & approximation** — Lagrange, Newton, splines, least squares
4. **Root finding** — bisection, Newton, secant
5. **Numerical integration & differentiation**
6. **ODEs & PDEs** — Euler → Runge-Kutta → finite differences
7. **Eigenvalues** — power iteration, QR algorithm
8. **Optimization & FFT** for completeness

## Topics

- **Error analysis** — absolute / relative error, floating-point (IEEE 754), machine epsilon, conditioning, stability
- **Linear systems (direct)** — Gaussian elimination, LU decomposition, partial / full pivoting, Cholesky
- **Linear systems (iterative)** — Jacobi, Gauss-Seidel, SOR, conjugate gradient (CG), GMRES
- **Linear least squares** — normal equations, QR, SVD
- **Interpolation** — Lagrange, Newton's divided differences, cubic splines, Chebyshev
- **Root finding** — bisection, false position, fixed-point iteration, Newton-Raphson, secant
- **Numerical differentiation** — forward / backward / central differences, Richardson extrapolation
- **Numerical integration** — trapezoidal, Simpson 1/3 & 3/8, Romberg, Gaussian quadrature
- **ODEs (IVP)** — Euler explicit / implicit, RK4, adaptive RK (Dormand-Prince), stiffness
- **PDEs** — finite differences (FTCS, BTCS, Crank-Nicolson), stability (CFL)
- **Eigenvalues** — power iteration, inverse iteration, QR algorithm, Lanczos
- **Optimization** — gradient descent, Newton, BFGS, line search
- **FFT** — Cooley-Tukey, applications (signal processing, spectral methods)

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Convergence orders**

| Method            | Order             | Notes                                |
| ----------------- | ----------------- | ------------------------------------ |
| Bisection         | linear (1)        | always converges if sign change      |
| Fixed-point       | linear            | needs \|g'(x*)\| < 1                  |
| Newton-Raphson    | quadratic (2)     | needs good initial guess + f'≠0      |
| Secant            | superlinear (~1.618) | no derivative needed              |
| Euler (ODE)       | O(h)              | explicit, can be unstable            |
| RK4               | O(h⁴)             | workhorse explicit method            |
| Trapezoidal int.  | O(h²)             | simple                               |
| Simpson 1/3       | O(h⁴)             | needs even intervals                 |

**Conditioning** — κ(A) = ‖A‖‖A⁻¹‖. Large κ ⇒ small input perturbations cause large output error.

**Machine epsilon (double precision):** ≈ 2.22 × 10⁻¹⁶

**Stability rules of thumb**

- Explicit Euler for diffusion: Δt ≤ Δx² / (2D)
- CFL for advection: Δt · |c| / Δx ≤ 1

</details>

## Resources

- *Scientific Computing: An Introductory Survey* — Michael T. Heath
- *Numerical Analysis* — Burden & Faires
- *Numerical Linear Algebra* — Trefethen & Bau
- *Numerical Recipes* — Press, Teukolsky, Vetterling, Flannery
- SciPy + NumPy docs (canonical practical implementations)

## Drawings

- [[Scientific-Computing.excalidraw|Scientific Computing (main canvas)]]
