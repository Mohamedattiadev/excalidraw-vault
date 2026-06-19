---
title: Design Patterns
---


OOP design patterns — Gang of Four classics + practical usage notes.

## Prerequisites

- OOP fundamentals — classes, inheritance, polymorphism, composition
- UML class & sequence diagrams (read-level)
- Refactoring basics (extract method/class, dependency inversion)
- One typed OOP language (Java / C# / TypeScript) for the examples

## Learning path

1. **SOLID** principles (decisions every pattern depends on)
2. **Creational** patterns (control object construction)
3. **Structural** patterns (compose objects into bigger ones)
4. **Behavioral** patterns (coordinate object interactions)
5. **Anti-patterns** + when *not* to use a pattern
6. Architectural patterns (MVC, MVVM, Hexagonal) — see Software Architecture

## Topics

- **SOLID** — SRP, OCP, LSP, ISP, DIP
- **Creational** — Singleton, Factory Method, Abstract Factory, Builder, Prototype
- **Structural** — Adapter, Decorator, Facade, Proxy, Composite, Bridge, Flyweight
- **Behavioral** — Strategy, Observer, Command, Iterator, State, Template Method, Visitor, Chain of Responsibility, Mediator, Memento, Interpreter
- **Concurrency patterns** — Producer-Consumer, Read-Write Lock, Thread Pool
- **Anti-patterns** — God Object, Spaghetti Code, Lava Flow, Premature Optimization
- **Refactoring tactics** — extract / inline, move method, replace conditional with polymorphism

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**GoF 23 quick reference**

| Group       | Pattern                 | Intent (one line)                                     |
| ----------- | ----------------------- | ----------------------------------------------------- |
| Creational  | Singleton               | Single shared instance with global access             |
| Creational  | Factory Method          | Subclass picks the concrete type to instantiate       |
| Creational  | Abstract Factory        | Build families of related objects                     |
| Creational  | Builder                 | Step-by-step construction of a complex object         |
| Creational  | Prototype               | Clone an existing instance                            |
| Structural  | Adapter                 | Convert one interface to another                      |
| Structural  | Decorator               | Wrap to add responsibilities dynamically              |
| Structural  | Facade                  | One simple entry point over a subsystem               |
| Structural  | Proxy                   | Stand-in controlling access to another object         |
| Structural  | Composite               | Tree of part-whole objects, uniform interface         |
| Structural  | Bridge                  | Decouple abstraction from implementation              |
| Structural  | Flyweight               | Share fine-grained objects to save memory             |
| Behavioral  | Strategy                | Interchangeable algorithm via composition             |
| Behavioral  | Observer                | Subscribers react to subject state changes            |
| Behavioral  | Command                 | Encapsulate a request as an object                    |
| Behavioral  | Iterator                | Walk a collection without exposing internals          |
| Behavioral  | State                   | Behavior changes with internal state                  |
| Behavioral  | Template Method         | Skeleton in base, steps overridden in subclass        |
| Behavioral  | Visitor                 | New operation on a class hierarchy without editing it |
| Behavioral  | Chain of Responsibility | Pass a request through a chain of handlers            |
| Behavioral  | Mediator                | Central object coordinates peers                      |
| Behavioral  | Memento                 | Snapshot + restore internal state                     |
| Behavioral  | Interpreter             | Grammar + interpret a small language                  |

</details>

## Resources

- *Design Patterns: Elements of Reusable Object-Oriented Software* — Gamma, Helm, Johnson, Vlissides (the GoF book)
- *Head First Design Patterns* — Freeman & Robson (gentler intro)
- *Refactoring* — Martin Fowler
- refactoring.guru — online catalog with diagrams
- *Clean Code* — Robert C. Martin (SOLID + practice)

## Drawings

- [[Design-Patterns.excalidraw|Design Pattern (main canvas)]]
