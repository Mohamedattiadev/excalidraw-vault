---
title: Software Architecture
---


Architecture patterns, quality attributes, and evaluation.

## Prerequisites

- Software engineering fundamentals (SDLC, requirements, design)
- OOP + Design Patterns (see 02-DesignPatterns)
- Distributed systems intuition (basic networking + DB knowledge)
- Familiarity with at least one full app stack end-to-end

## Learning path

1. **Architectural styles** — survey the catalog before picking one
2. **Quality attributes** — what the system must *also* be (perf, scale, secure…)
3. **Tactics** — concrete techniques to hit each quality attribute
4. **Documentation** — views & 4+1 model so others can read your design
5. **Patterns vs styles** — when each applies
6. **Evaluation** — ATAM, scenario-based reviews
7. **Modern topics** — microservices, DDD, cloud-native, event sourcing

## Topics

- **Architectural styles** — layered, client-server, microservices, monolith, event-driven, pipe-filter, REST, RPC, P2P, serverless
- **Quality attributes** — performance, scalability, availability, reliability, security, modifiability, testability, usability
- **Tactics** — caching, replication, redundancy, encryption, separation of concerns, dependency inversion
- **Documentation** — views (logical, deployment, process, physical), 4+1 model, C4 model, ADRs
- **Architectural patterns** — MVC, MVVM, hexagonal (ports & adapters), clean architecture, CQRS, event sourcing, saga
- **Domain-driven design** — bounded context, ubiquitous language, aggregates, domain events
- **Cloud-native** — 12-factor app, containers, orchestration (Kubernetes), service mesh
- **Microservices concerns** — API gateway, service discovery, circuit breaker, distributed tracing
- **Evaluation** — ATAM, SAAM, CBAM, scenario-based reviews, fitness functions
- **Anti-patterns** — distributed monolith, big ball of mud, golden hammer, leaky abstraction

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Quality attributes ↔ tactics**

| Attribute       | Common tactics                                              |
| --------------- | ----------------------------------------------------------- |
| Performance     | caching, async, batching, indexing, reduce coupling         |
| Scalability     | horizontal scale, sharding, stateless services, CDN         |
| Availability    | replication, failover, health checks, graceful degradation  |
| Security        | authentication, authorization, encryption, input validation |
| Modifiability   | low coupling, high cohesion, abstraction layers, plugins    |
| Testability     | dependency injection, mocking seams, contract tests         |

**4+1 architectural views (Kruchten)**

- **Logical** — what the system *does* (modules, classes)
- **Process** — runtime behavior (threads, communication)
- **Development** — code organization (packages, layers)
- **Physical / Deployment** — hardware mapping
- **+1 Scenarios** — use cases tying the four together

**Monolith vs Microservices (when)**

| Concern       | Monolith            | Microservices            |
| ------------- | ------------------- | ------------------------ |
| Team size     | small               | many independent teams   |
| Deploy speed  | fast (one unit)     | fast per service         |
| Ops cost      | low                 | high (infra, observability) |
| Data consistency | trivial          | complex (sagas, events)  |
| Best when     | start-up / MVP      | mature, large-scale      |

</details>

## Resources

- *Software Architecture in Practice* — Bass, Clements, Kazman
- *Fundamentals of Software Architecture* — Richards & Ford
- *Designing Data-Intensive Applications* — Kleppmann
- *Patterns of Enterprise Application Architecture* — Martin Fowler
- *Building Microservices* — Sam Newman
- *Domain-Driven Design* — Eric Evans
- c4model.com (lightweight architecture diagrams)

## Drawings

- [[Software-Architecture.excalidraw|Software Architecture (Ch 5+)]]

## PDFs

- 8.1 - Software Architecture - chp (1-4) — source PDF (High / Mid quality variants)
