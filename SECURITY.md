# Security policy

## Supported version

Security fixes are applied to the current default branch. Copied product repositories own
their deployed versions and must maintain their own support policy.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub private vulnerability
reporting for this repository. If private reporting is unavailable, contact the repository
owner through a private channel listed on their GitHub profile.

Include the affected component, reproduction steps, impact, and any known mitigation. Do not
include real credentials, production data, or personal data.

The maintainers aim to acknowledge a report within three business days, provide an initial
assessment within seven business days, and coordinate disclosure after a fix is available.

## Foundation boundary

This repository provides technical security controls, not a finished product security model.
A copied product is not ready for production until it adds and reviews identity, sessions,
authorization vocabulary, tenant policies, secret management, deployment isolation, abuse
controls, backup/restore, and product-specific threat tests.

Tenant products must follow [the tenant isolation contract](./docs/architecture/tenant-isolation.md).
