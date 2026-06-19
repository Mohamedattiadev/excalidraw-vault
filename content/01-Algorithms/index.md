---
title: Algorithms
---


Visual notes on algorithm analysis & classic problems.

## Prerequisites

- Discrete math (sets, induction, basic combinatorics)
- Data structures — arrays, linked lists, stacks, queues, hash tables
- Recursion + invariants
- Basic C / Java / Python for implementation

## Learning path

1. Asymptotic notation + recurrences (foundation for all later analysis)
2. Sorting & searching (warm-up — compare paradigms in the small)
3. Trees / heaps / hashing (the data-structure trio that powers everything else)
4. Divide & conquer → DP → greedy (paradigms in order of generality)
5. Graph algorithms (apply paradigms on a richer structure)
6. Strings, geometry, number theory (specialty topics)
7. NP-completeness & approximation (the "when nothing works" toolbox)

## Topics

- **Asymptotic notation** — O / Θ / Ω, growth rates
- **Sorting** — merge sort, quick sort, radix sort, heap sort
- **Searching** — linear, binary, ternary
- **Trees** — BST, AVL, red-black, B-tree, segment tree, Fenwick (BIT), trie
- **Heaps** — binary, Fibonacci, pairing
- **Hashing** — open addressing, chaining, rolling hash
- **Dynamic programming** — 0/1 + fractional knapsack, coin change, LIS, LCS, edit distance, matrix chain mult, bitmask DP
- **Divide & conquer** — matrix multiplication (Strassen), closest pair, FFT
- **Greedy** — activity selection, Huffman coding, Kruskal / Prim MST
- **Graph algorithms** — BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, A*, max-flow (Ford-Fulkerson, Edmonds-Karp), SCC (Tarjan, Kosaraju), topo sort
- **Strings** — KMP, Z-algorithm, Rabin-Karp, suffix array
- **Backtracking** — N-queens, Sudoku, subset sum, permutations
- **NP-completeness** — SAT/3-SAT, vertex cover, reductions
- **Approximation** — vertex cover 2-approx, TSP, PTAS / FPTAS
- **Randomized** — skip list, treap, Monte Carlo, Las Vegas
- **Computational geometry** — convex hull, line intersection
- **Number theory** — GCD, modular inverse, sieve, CRT, Miller-Rabin
- **Recurrences** — master theorem, substitution, Akra-Bazzi

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Sorting complexities**

| Algorithm   | Best       | Average    | Worst       | Space   | Stable |
| ----------- | ---------- | ---------- | ----------- | ------- | ------ |
| Insertion   | O(n)       | O(n²)      | O(n²)       | O(1)    | yes    |
| Merge       | O(n log n) | O(n log n) | O(n log n)  | O(n)    | yes    |
| Quick       | O(n log n) | O(n log n) | O(n²)       | O(log n)| no     |
| Heap        | O(n log n) | O(n log n) | O(n log n)  | O(1)    | no     |
| Radix       | O(nk)      | O(nk)      | O(nk)       | O(n+k)  | yes    |

**Master theorem** for `T(n) = aT(n/b) + f(n)`, with `c = log_b(a)`:

- Case 1: `f(n) = O(n^(c-ε))` → `T(n) = Θ(n^c)`
- Case 2: `f(n) = Θ(n^c)` → `T(n) = Θ(n^c log n)`
- Case 3: `f(n) = Ω(n^(c+ε))` and regularity → `T(n) = Θ(f(n))`

**Common graph algo complexities**

| Algorithm        | Time              | Notes              |
| ---------------- | ----------------- | ------------------ |
| BFS / DFS        | O(V + E)          | both linear        |
| Dijkstra (heap)  | O((V+E) log V)    | non-negative edges |
| Bellman-Ford     | O(VE)             | detects neg cycle  |
| Floyd-Warshall   | O(V³)             | all-pairs          |
| Kruskal / Prim   | O(E log V)        | MST                |

</details>

## Resources

- *Introduction to Algorithms* — Cormen, Leiserson, Rivest, Stein (CLRS)
- *Algorithms* — Sedgewick & Wayne (+ free Coursera course)
- *The Algorithm Design Manual* — Skiena
- MIT 6.006 / 6.046 (OpenCourseWare)
- Competitive programming: cp-algorithms.com, USACO Guide

## Drawings

- [[Algorithms.excalidraw|Algo (main canvas)]]
