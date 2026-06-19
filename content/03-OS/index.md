---
title: Operating Systems
---


OS notes by chapter, plus the xv6 workflow.

## Topics

- Ch 1: OS and storage devices, what an OS is, practice exercises
- Ch 3-4: Process and thread (most modern OSes are multithreaded)
- Ch 5: CPU scheduling
  - FCFS (First Come First Served)
  - SJF (Shortest Job First)
  - SRTF (Shortest Remaining Time First)
  - Round Robin (RR)
  - Priority scheduling, Priority with RR
- Ch 6-8: Synchronization and deadlocks
  - Race condition
  - Critical section rules
  - Methods for handling deadlocks
  - Local vs global vs heap variables and locking
- Ch 9: Memory management
  - Goals of memory management
  - Sharing physical memory, memory protection
  - Logical (virtual) memory
  - Swapping (and context switch time)
  - Roll Out / Roll In with priority scheduling
  - Segmentation, segment tables, fragmentation
  - Paging, paging advantages and disadvantages
  - Page tables, page table structures (multilevel, hashed, inverted)
  - Address translation, MMU, TLB
  - Dynamic loading, dynamic linking
- Ch 10: Virtual memory
  - Core idea, virtual address space
  - Demand paging, valid / invalid bit
  - Page replacement: LRU, OPT, FIFO
  - Locality, working set model
  - Thrashing: what, why, how to prevent
  - Copy-on-write
  - Allocation of frames
  - Kernel memory allocation
- Ch 11-12: File system
  - File types, files
  - File allocation methods, allocation method performance
  - File system implementation and layers
  - Protection of files and directories
  - Free-space management
  - Journaling file systems
  - Backups
  - File system examples
- Ch 13-14: I/O devices
- Ch 18: Virtual machines
  - What a VM is, history and importance
  - Reasons to virtualize, benefits, cloud computing
  - Virtual Machine Monitor (VMM / Hypervisor), hardware support
  - Memory virtualization
  - I/O virtualization
  - Storage virtualization, live migration
  - Application containment
- Recovery
- Final exam questions and summaries from the book

## Drawings

- [[xv6-Workflow.excalidraw|xv6 Workflow]]
- [[Operating-Systems.excalidraw|OS (main canvas)]]
