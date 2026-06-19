---
title: Operating Systems
---


OS internals notes — heavy focus on xv6 (the MIT teaching kernel).

## Prerequisites

- C programming (pointers, structs, manual memory management)
- Computer organization — memory hierarchy, registers, ISA basics
- Assembly literacy (x86 or RISC-V) for trap/context code
- Data structures (queues, trees) + basic algorithms

## Learning path

1. **Big picture** — what an OS *is*; xv6 boot flow end-to-end
2. **Processes** — fork/exec/wait, PCB, context switching
3. **Scheduling** — policies + tradeoffs
4. **Memory** — paging, virtual memory, page tables
5. **Concurrency** — locks, condition variables, deadlocks
6. **File systems** — inodes, journaling, crash consistency
7. **I/O & drivers** — interrupts, DMA, block / char devices
8. **Virtualization & isolation** — VMs, containers, namespaces

## Topics

- **xv6 workflow** — boot, kernel entry, user/kernel transition
- **Processes** — fork/exec, PCB, context switching, signals
- **Threads** — kernel vs user threads, scheduler activations
- **Scheduling** — FCFS, SJF, round-robin, priority, MLFQ, CFS
- **Memory management** — paging, segmentation, virtual memory, page tables, TLB, page replacement (LRU, clock)
- **Synchronization** — locks (spin, mutex), semaphores, condition variables, monitors, deadlock prevention (Banker's)
- **File systems** — inodes, directory structure, journaling, log-structured FS, FAT/ext/NTFS
- **I/O** — interrupts, DMA, polling, device drivers
- **System calls** — trap handling, syscall interface, ABI
- **Security & isolation** — user/kernel mode, capabilities, sandboxing, ASLR

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Scheduling policies**

| Policy        | Optimizes for     | Starvation? | Preemptive |
| ------------- | ----------------- | ----------- | ---------- |
| FCFS          | simplicity        | no          | no         |
| SJF           | avg turnaround    | yes (long)  | no         |
| SRTF          | avg turnaround    | yes (long)  | yes        |
| Round-robin   | fairness          | no          | yes        |
| Priority      | important jobs    | yes (low)   | either     |
| MLFQ          | mixed workloads   | mitigated   | yes        |

**Process states:** new → ready ⇄ running → waiting → ready → terminated

**Memory hierarchy (typical access time):**
register (~1 cycle) → L1 (~4) → L2 (~12) → L3 (~40) → DRAM (~100ns) → SSD (~100µs) → HDD (~10ms)

**Deadlock — four necessary conditions:** mutual exclusion, hold-and-wait, no preemption, circular wait. Break any one to prevent.

</details>

## Resources

- *Operating Systems: Three Easy Pieces* (OSTEP) — Remzi Arpaci-Dusseau (free PDF)
- *Modern Operating Systems* — Tanenbaum & Bos
- *Operating System Concepts* — Silberschatz, Galvin, Gagne
- *xv6: a simple, Unix-like teaching operating system* — MIT 6.S081 book + labs
- MIT 6.S081 / 6.828 OpenCourseWare

## Drawings

- [[xv6-Workflow.excalidraw|xv6 Workflow]]
- [[Operating-Systems.excalidraw|OS (main canvas)]]
