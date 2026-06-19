---
title: Networking
---


Computer networking notes by chapter, plus the summary.

## Topics

- Ch 1: Intro
  - History
  - What is the Internet, network of networks
  - What is a protocol, what a protocol defines
  - Examples of Internet protocols
  - Network edge
  - Access networks (cable-based, home networks), two key properties
  - Physical media: guided (cables), unguided (wireless)
  - Network core, two key functions
    - Packet switching: store-and-forward, queueing
    - Circuit switching: FDM and TDM
    - Circuit vs packet
  - Internet structure
  - Performance: delay, loss, throughput
  - Why is the Internet sometimes slow
  - Protocol layers
  - Security
- Ch 2: Application layer
  - What the application layer is
  - Creating a network app, types of network applications
  - Client-server model, peer-to-peer (P2P)
  - Processes communication, sockets, addressing processes
  - Application-layer protocol
  - Transport service an app needs, Internet transport services
  - Web and HTTP
    - Types of HTTP messages, request messages
    - Persistent vs non-persistent
    - Cookies and state
    - Web caching and proxy
    - HTTP/2 and HTTP/3
  - Securing TCP with TLS
  - Email: SMTP (send only), IMAP, three phases
  - DNS
- Ch 3: Transport layer
  - What the transport layer does
  - Multiplexing and demultiplexing
  - Connectionless transport: UDP, UDP actions
  - Principles of reliable data transfer (rdt 2.0, 2.1, 2.2, 3.0)
  - Go-Back-N and Selective Repeat
  - Connection-oriented transport: TCP
  - Principles of congestion control, TCP congestion control
  - Evolution of transport-layer functionality
- Ch 4: Network layer
  - Forwarding (local action)
  - Routing (global action)
- Ch 6: Summary

## Drawings

- [[Computer-Networking.excalidraw|Computer Networking (main canvas)]]
