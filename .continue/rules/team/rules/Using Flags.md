---
name: Using Flags
description: When I'm implementing a new feature
alwaysApply: false
---

Rule 1: LaunchDarkly Evaluation Must Be Centralized

- All variation and variationDetail calls must go through a shared evaluation function.

This wrapper must:

- Use the singleton instance

- Support mock/local overrides for development/testing

- Enable optional instrumentation (e.g., metrics, logging)

- Evaluation must occur as close as possible to where the flag value is used to support accurate flag status tracking.

Rule 2: LaunchDarkly Context Object Standards

- Applications must document how context objects are constructed, including attribute sources.

- Context objects:

- Must have high cardinality (e.g., user ID, session ID)

- Must not contain or be derived from PII (e.g., don’t hash emails)

- Shared utilities should exist for creating context objects from application-specific data (e.g., createLDContextFor(userObject)).

Rule 3: LaunchDarkly Context Custom Attributes

- Must include attributes that support release strategies:

- Build version or commit SHA

- Session ID or device ID

- Developer identifier or PR ID in ephemeral environments

Client-side SDKs must:

- Avoid frequent identify() or re-initialization calls

- Use state transitions (e.g., anonymous → authenticated) to manage identity

- Cache timestamps may be included

Rule 4: LaunchDarkly Flag Evaluation Predictable Fallback Behavior

- Applications must handle fallback values deterministically.

- Avoid using allFlags() in production due to inconsistent behavior across SDKs.

- Fallbacks should always be passed to variation()/variationDetail() and tested in implementation.