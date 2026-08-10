---
title: Operating Systems
aliases:
  - "03-OS"
  - "03-OS/index"
---


The OS course, chapter by chapter, plus a separate canvas for how xv6 actually
boots and runs.

Memory, virtual memory, the file system and virtual machines got their own
sections here, because each one is a whole chapter on its own.

## Drawings

- [[xv6-Workflow.excalidraw|xv6 Workflow]]
- [[Operating-Systems.excalidraw|OS (main canvas)]]

## Chapters

| Ch      | Topics                                                                                       |
| ------- | -------------------------------------------------------------------------------------------- |
| 1       | What an OS is, OS and storage devices, practice exercises                                    |
| 3-4     | Process, thread (most modern OSes are multithreaded)                                           |
| 5       | CPU scheduling: FCFS, SJF, SRTF, Round Robin, Priority, Priority with RR                      |
| 6-8     | Synchronization and deadlocks: race condition, critical section rules, handling deadlocks      |
| 9       | Memory management (see below)                                                                |
| 10      | Virtual memory (see below)                                                                   |
| 11-12   | File system (see below)                                                                      |
| 13-14   | I/O devices                                                                                  |
| 18      | Virtual machines (see below)                                                                 |

## Memory management (Ch 9)

| Topic                  | Items                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Goals                  | Sharing physical memory, memory protection                                              |
| Logical memory         | Virtual memory, swapping, context switch time, roll out / roll in (priority scheduling) |
| Segmentation           | Segment tables, fragmentation                                                          |
| Paging                 | Advantages and disadvantages, address translation                                       |
| Page tables            | Multilevel paging, hashed page table, inverted page table                                |
| Hardware               | MMU, TLB                                                                                |
| Loading and linking    | Dynamic loading, dynamic linking                                                        |

## Virtual memory (Ch 10)

| Topic                  | Items                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Core idea              | Virtual address space, demand paging, valid / invalid bit                              |
| Page replacement       | LRU, OPT, FIFO (the important ones)                                                    |
| Access patterns        | Locality, working set model                                                            |
| Thrashing              | What it is, why it happens, how to prevent                                              |
| Other                  | Copy-on-write, allocation of frames, kernel memory allocation                           |

## File system (Ch 11-12)

| Topic           | Items                                                              |
| --------------- | ------------------------------------------------------------------ |
| Basics          | File types, file allocation methods, allocation method performance  |
| Protection      | Files and directories                                              |
| Structure       | File system implementation and layers                              |
| Storage         | Free-space management, journaling file systems, backups             |
| Examples        | File system examples                                               |

## Virtual machines (Ch 18)

| Topic         | Items                                                              |
| ------------- | ------------------------------------------------------------------ |
| Intro         | What a VM is, history and importance                               |
| Why           | Reasons to virtualize, benefits, cloud computing                    |
| Monitor       | Virtual Machine Monitor (VMM / Hypervisor), hardware support        |
| Resources     | Memory, I/O, storage virtualization, live migration                 |
| Isolation     | Application containment                                            |

## Other

| Topic         | Notes                                                              |
| ------------- | ------------------------------------------------------------------ |
| Recovery      | Final-exam topic                                                   |
| Exam prep     | Summaries from the book, exam-style questions                       |

## Resources

The links I actually used, pulled straight off the canvas.

| Topic                    | Resource                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Silberschatz OS Concepts | [Go to link](https://os.ecci.ucr.ac.cr/slides/Abraham-Silberschatz-Operating-System-Concepts-10th-2018.pdf) |
| CPU Scheduling           | [Go to link](https://www.youtube.com/watch?v=-Izsh82Ykmg)                                              |
| OS intro                 | [Go to link](https://www.youtube.com/watch?v=vBURTt97EkA)                                              |
| Deadlock Detection       | [Go to link](https://www.youtube.com/watch?v=tb843MRs_0Q)                                              |
| First / Best / Worst Fit | [Go to link](https://www.youtube.com/watch?v=N3rG_1CEQkQ)                                              |
| Disk Scheduling          | [Go to link](https://www.youtube.com/watch?v=yrO5fvXlESE&t=8s)                                         |
| Page Replacement         | [Go to link](https://www.youtube.com/watch?v=cjWnEtnKVGM)                                              |
