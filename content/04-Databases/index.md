---
title: Databases
---


Database concepts, design, SQL, transactions, and indexing.

## Intro and model

| Topic                | Items                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| File-based systems   | Limitations                                                                                 |
| What a DB is         | Advantages, disadvantages                                                                    |
| Characteristics      | Self-describing, stores data + metadata, program-data independence                          |
| DBMS functionality   | Define, Construct, Manipulate, Share, Protect, Maintain                                      |
| Users                | Database users                                                                              |
| History              | Data models, categories, three-schema architecture                                          |
| Relational model     | Schemas, relation state, math definition, model notation, relational DB schema and state    |

## Constraints

| Type                   | Notes                                |
| ---------------------- | ------------------------------------ |
| Key                    | Primary, candidate, etc.             |
| Functional dependency  | FD theory                            |
| Semantic integrity     | Business rules                       |
| Retrieval              | Constraints on queries               |
| Circular referencing   | Self-reference issue                 |

## Relational algebra (I and II) and SQL

| Topic                  | Items                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Algebra operations     | Unary, Cartesian product, JOIN, division                                        |
| Queries                | Queries in relational algebra, query tree notation                              |
| SQL basics             | Tables as sets, pattern matching, LIKE, ORDER BY                                 |
| SQL joins              | JOINs                                                                          |
| SQL extras             | Qualifying of attributes, nested queries, inserting multiple rows, VIEW          |

## ER / EER

| Topic                  | Items                                                  |
| ---------------------- | ------------------------------------------------------ |
| ER and EER             | Entity relations                                       |
| Mapping                | ER and EER to relational mapping                       |

## Normalization

| Topic                  | Items                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Guidelines             | Informal design guidelines for relation schemas                                 |
| FD theory              | Functional dependencies                                                        |
| Normal forms           | 3NF, BCNF                                                                      |
| Practice               | Practical use of normal forms, how to fix bad tables                            |

## Transactions

| Topic                  | Items                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Properties             | ACID                                                                           |
| Isolation              | Transaction isolation levels, SQL tools for isolation, SELECT FOR UPDATE         |
| Locks                  | Lock types, lock granularity                                                   |
| Concurrency control    | Approaches                                                                     |
| Schedules              | Serializability (serial vs serializable)                                        |
| Recovery               | Recovery techniques                                                            |

## Indexing

| Topic                  | Items                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Basics                 | Index definition, basics, design, update                                        |
| With SQL               | Indexes and SQL                                                                |
| Single-level           | Single-level ordered indexes                                                   |
| Multi-level            | Multi-level ordered indexes                                                    |
| Trees                  | B-Tree, B+ Tree                                                                |
| Hash                   | Hash indexes                                                                   |
| Types                  | Dense, sparse, clustered, unclustered                                          |
| Metrics                | Index evaluation metrics                                                       |
| Storage                | File organization, index-organized tables in Oracle                             |

## Resources

Video links pulled from the canvas. Click to open.

| Topic                 | Resources                                                                      |
| --------------------- | ------------------------------------------------------------------------------ |
| How to study          | [v1](https://www.youtube.com/watch?v=_UZLrD_R0T4)                              |
| Indexing key videos   | [v1](https://www.youtube.com/watch?v=aZjYr87r1b8), [v2](https://www.youtube.com/watch?v=pN4C8cLVc7I) |
| B-Tree                | [v1](https://www.youtube.com/watch?v=1ZhBULsbZGw)                              |

## Drawings

- [[Databases.excalidraw|DB (main canvas)]]
