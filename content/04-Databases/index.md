---
title: Databases
---


Relational database concepts, SQL, and design.

## Prerequisites

- Set theory + first-order logic basics (for relational algebra)
- Data structures — B-trees, hash tables
- One programming language for working with a DB driver
- Basic OS concepts (files, pages, buffers)

## Learning path

1. **Relational model** + relational algebra
2. **SQL** — DDL, DML, joins, subqueries, aggregation, window functions
3. **ER modeling** → schema design
4. **Normalization** — kill redundancy, anomalies
5. **Transactions** — ACID, isolation levels, concurrency control
6. **Indexing & storage** — how the data physically lives
7. **Query optimization** — plans, cost models, statistics
8. **Beyond relational** — NoSQL, distributed, CAP, eventual consistency

## Topics

- **Relational model** — tables, keys (primary / foreign / candidate), constraints
- **Relational algebra** — σ, π, ⋈, ∪, −, ÷
- **SQL** — DDL, DML, joins, subqueries, aggregation, window functions, CTEs, views
- **Normalization** — 1NF → 2NF → 3NF → BCNF → 4NF, functional dependencies
- **ER modeling** — entities, relationships, cardinality, weak entities, ISA hierarchies
- **Transactions** — ACID, isolation levels (read-uncommitted → serializable), 2PL, MVCC
- **Concurrency anomalies** — dirty read, non-repeatable read, phantom, lost update
- **Indexing** — B+ tree, hash, bitmap, covering indexes, composite indexes
- **Query optimization** — logical & physical plans, join order, cost estimation
- **Storage** — pages, slotted pages, buffer pool, file organization (heap, sorted, hash)
- **Recovery** — WAL, ARIES, checkpoints, undo / redo
- **Distributed DBs** — sharding, replication (sync / async), consensus, CAP, BASE
- **NoSQL families** — key-value, document, column-family, graph

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**ACID**

| Letter | Meaning      | Guarantee                                                    |
| ------ | ------------ | ------------------------------------------------------------ |
| A      | Atomicity    | All operations commit, or none                               |
| C      | Consistency  | Constraints hold before and after                            |
| I      | Isolation    | Concurrent txns appear serial                                |
| D      | Durability   | Committed data survives crashes                              |

**Isolation levels — anomalies allowed**

| Level             | Dirty read | Non-repeatable | Phantom |
| ----------------- | ---------- | -------------- | ------- |
| Read uncommitted  | ✓          | ✓              | ✓       |
| Read committed    | ✗          | ✓              | ✓       |
| Repeatable read   | ✗          | ✗              | ✓       |
| Serializable      | ✗          | ✗              | ✗       |

**Normal forms (one-liners)**

- **1NF** — atomic values, no repeating groups
- **2NF** — 1NF + no partial dependency on composite key
- **3NF** — 2NF + no transitive dependency on key
- **BCNF** — every determinant is a superkey

**CAP** — under network partition, pick Consistency or Availability. Not both.

</details>

## Resources

- *Database System Concepts* — Silberschatz, Korth, Sudarshan
- *Fundamentals of Database Systems* — Elmasri & Navathe
- *Database Systems: The Complete Book* — Garcia-Molina, Ullman, Widom
- *Designing Data-Intensive Applications* — Kleppmann (modern distributed angle)
- CMU 15-445 / 15-721 (Andy Pavlo lectures on YouTube)

## Drawings

- [[Databases.excalidraw|DB (main canvas)]]
