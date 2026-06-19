---
title: Networking
---


Computer networks — protocols, architecture, addressing.

## Prerequisites

- OS fundamentals (processes, file descriptors, sockets)
- Basic programming + ability to run a socket client/server
- Binary / hex arithmetic for addressing and subnetting
- Some signals/encoding intuition (helpful, not required)

## Learning path

1. **Layered models** — OSI & TCP/IP, encapsulation
2. **Physical & data link** — framing, MAC addressing, switching
3. **Network layer** — IP addressing, subnetting, routing
4. **Transport layer** — TCP vs UDP, reliability, flow & congestion control
5. **Application layer** — HTTP, DNS, mail, file transfer
6. **Sockets** — write a tiny client/server end-to-end
7. **Security & operations** — TLS, NAT, firewalls, QoS
8. **Modern topics** — IPv6, SDN, HTTP/2-3, QUIC

## Topics

- **OSI & TCP/IP models** — layer responsibilities, encapsulation
- **Physical layer** — signals, encoding, bandwidth, transmission media
- **Data link** — framing, MAC, Ethernet, ARP, switching, VLANs
- **Network layer** — IPv4 / IPv6, subnetting, CIDR, NAT, ICMP, routing (RIP, OSPF, BGP)
- **Transport layer** — TCP handshake, sliding window, flow control, congestion control (Tahoe, Reno, Cubic, BBR), UDP, QUIC
- **Application layer** — HTTP / HTTPS, HTTP/2 + HTTP/3, DNS, SMTP / IMAP / POP3, FTP, DHCP, SSH
- **Sockets** — Berkeley API, client/server programming
- **Wireless** — Wi-Fi (802.11), Bluetooth, cellular (4G/5G)
- **Network security** — TLS, IPsec, VPNs, firewalls, IDS / IPS, DDoS mitigation
- **QoS & SDN** — DiffServ, IntServ, OpenFlow, network function virtualization
- **Performance** — throughput, latency, jitter, packet loss, RTT

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**OSI ↔ TCP/IP**

| OSI Layer    | TCP/IP                 | Example protocols                |
| ------------ | ---------------------- | -------------------------------- |
| 7 Application| Application            | HTTP, DNS, SMTP, SSH             |
| 6 Presentation| Application           | TLS, MIME                        |
| 5 Session    | Application            | NetBIOS, RPC                     |
| 4 Transport  | Transport              | TCP, UDP, QUIC                   |
| 3 Network    | Internet               | IP, ICMP, OSPF, BGP              |
| 2 Data Link  | Link                   | Ethernet, ARP, PPP               |
| 1 Physical   | Link                   | cables, fiber, radio             |

**Well-known ports**

| Port | Service     |
| ---- | ----------- |
| 20/21| FTP         |
| 22   | SSH         |
| 23   | Telnet      |
| 25   | SMTP        |
| 53   | DNS         |
| 67/68| DHCP        |
| 80   | HTTP        |
| 110  | POP3        |
| 143  | IMAP        |
| 443  | HTTPS       |
| 3306 | MySQL       |
| 5432 | PostgreSQL  |
| 6379 | Redis       |

**IPv4 private ranges:** 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
**Subnet mask quick recall:** /24 = 256 addresses, /28 = 16, /30 = 4

**TCP 3-way handshake:** SYN → SYN-ACK → ACK
**TCP 4-way close:** FIN → ACK, FIN → ACK

</details>

## Resources

- *Computer Networking: A Top-Down Approach* — Kurose & Ross
- *Computer Networks* — Tanenbaum & Wetherall
- *TCP/IP Illustrated* — Stevens (deep dive)
- High Performance Browser Networking — Ilya Grigorik (free online)
- RFCs for protocol specs (RFC 9110 for HTTP/1.1, RFC 9114 for HTTP/3, etc.)

## Drawings

- [[Computer-Networking.excalidraw|Computer Networking (main canvas)]]
