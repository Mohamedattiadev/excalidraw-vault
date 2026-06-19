---
title: Security
---


Information security fundamentals, crypto, and attacks.

## Prerequisites

- Networking (TCP/IP, HTTP, DNS, TLS handshake) — see 05-Networking
- OS internals (processes, memory, syscalls) — see 03-OS
- Basic programming + reading C/assembly for memory-corruption topics
- Number theory basics (modular arithmetic) for crypto

## Learning path

1. **CIA triad + threat modeling** — frame what you're defending and from whom
2. **Cryptography** — symmetric → hashing → asymmetric → key exchange → PKI
3. **Authentication & authorization** — passwords, MFA, OAuth/JWT, RBAC/ABAC
4. **Network attacks & defenses** — MITM, replay, DoS, TLS, IDS/IPS, firewalls
5. **Web security** — OWASP Top 10
6. **System-level attacks** — memory corruption, privilege escalation, malware
7. **Operations** — incident response, logging, monitoring, risk management

## Topics

- **CIA triad** — Confidentiality, Integrity, Availability (+ Non-repudiation, Authenticity)
- **Threat modeling** — STRIDE, attack trees, kill chain, MITRE ATT&CK
- **Cryptography** — symmetric (AES, DES, ChaCha20), asymmetric (RSA, ECC), hashing (SHA-2, SHA-3, BLAKE2), HMAC, AEAD (GCM, ChaCha20-Poly1305)
- **Key exchange & PKI** — Diffie-Hellman, ECDH, certificates, CAs, certificate transparency
- **Authentication** — passwords (salting, KDFs: bcrypt, scrypt, Argon2), MFA / TOTP / WebAuthn, OAuth 2.0, OIDC, JWT
- **Authorization** — RBAC, ABAC, capabilities, principle of least privilege
- **Network attacks** — MITM, replay, DoS / DDoS, ARP spoofing, DNS poisoning, BGP hijack
- **Web attacks (OWASP Top 10)** — broken access control, crypto failures, injection (SQL/NoSQL), insecure design, misconfig, vulnerable components, auth failures, integrity failures, logging failures, SSRF, XSS, CSRF, IDOR
- **System-level** — buffer overflow, format string, ROP, use-after-free, integer overflow, race conditions, privilege escalation
- **Malware** — viruses, worms, trojans, ransomware, rootkits, reverse engineering basics
- **Defenses** — TLS, IPsec, VPN, firewalls (stateful / WAF), IDS / IPS, EDR, sandboxing, ASLR / DEP / CFI
- **Operations** — incident response (PICERL), SIEM, log analysis, forensics
- **Risk & policy** — risk assessment, compliance (GDPR, ISO 27001, PCI-DSS, HIPAA)

<details>
<summary><b>Cheatsheet</b> (click to expand)</summary>

**Crypto pick (when to use what)**

| Need                    | Use                          | Avoid                  |
| ----------------------- | ---------------------------- | ---------------------- |
| Bulk encryption         | AES-256-GCM, ChaCha20-Poly1305 | ECB, plain CBC       |
| Hashing (data integrity)| SHA-256, SHA-3, BLAKE2        | MD5, SHA-1            |
| Password storage        | Argon2id, bcrypt, scrypt      | MD5, SHA-256 raw      |
| MAC                     | HMAC-SHA-256, Poly1305        | CRC, raw hash         |
| Key exchange            | ECDH (X25519)                 | plain DH small primes |
| Signatures              | Ed25519, ECDSA-P256, RSA-PSS  | RSA-PKCS1 v1.5        |

**OWASP Top 10 (2021)**

1. Broken Access Control
2. Cryptographic Failures
3. Injection (incl. XSS)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable & Outdated Components
7. Identification & Authentication Failures
8. Software & Data Integrity Failures
9. Security Logging & Monitoring Failures
10. SSRF (Server-Side Request Forgery)

**Defense-in-depth layers:** perimeter (firewall) → network (segmentation, IDS) → host (EDR, hardening) → app (input validation, secure coding) → data (encryption at rest + transit) → people (training, MFA).

</details>

## Resources

- *Cryptography and Network Security* — William Stallings
- *Serious Cryptography* — Jean-Philippe Aumasson
- *The Web Application Hacker's Handbook* — Stuttard & Pinto
- *Hacking: The Art of Exploitation* — Jon Erickson
- OWASP — Top 10, Cheat Sheet Series, Testing Guide (owasp.org)
- PortSwigger Web Security Academy (free hands-on labs)
- NIST Cybersecurity Framework + SP 800 series

## Drawings

- [[Security.excalidraw|Security (main canvas)]]
