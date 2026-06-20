# Security Policy

MeadOS is a self-hosted application: you run `server.py` on your own machine or
home server, and your data lives in a local SQLite file. There is no MeadOS
cloud service. Still, the server has a public surface (the share page, the
calendar feed, and — if you enable it — external access), so security reports
are welcome.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Email **icemanxbe@gmail.com** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if you have one),
- the affected file/endpoint and, ideally, a suggested fix.

You'll get an acknowledgement as soon as reasonably possible. Since MeadOS is
maintained by one person in their spare time, please allow a reasonable window
for a fix before any public disclosure. Credit is gladly given in the fix commit
or release notes if you'd like it.

## Scope

In scope:

- `server.py` — request handling, the storage layer, the Home Assistant proxy,
  authentication/throttling, the share-page and calendar-feed endpoints, and the
  security headers / CSRF / origin checks.
- The client app under `core/` where it could enable an attack (e.g. stored XSS
  via unsanitised user input).

Out of scope:

- Issues that require an attacker to already have your `meados.db` file or
  shell access to the host.
- Running MeadOS exposed to the public internet **without** the documented
  protections.

## Deploying safely

MeadOS is designed for a **trusted LAN** by default. If you expose it beyond
that:

- set an [external-access password](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment),
- put it behind HTTPS (a reverse proxy such as Cloudflare Tunnel, Caddy or
  nginx),
- keep the host and Python up to date.

See **[Security & Deployment](https://github.com/icemanxbe/MeadOS/wiki/Security-and-Deployment)**
in the wiki for the full guidance.

## Supported versions

Only the latest `main` is supported. Pull the latest before reporting.
