---
invokable: true
name: Unit test
dcc_uri: prompts/unit_test
description: Generate unit tests for the selected code
version: '0.1'
dcc_tags:
  - back-end team
  - 'spring,open-shift'
  - microservices
  - docker containers
  - front-end team
  - angular
---
Write a complete unit test suite for the selected code.

Rules:
- Use JUnit 5 for Java, pytest for Python, Jest for JS/TS.
- Cover edge cases and failure paths.
- Include all imports and setup.
- Output complete, ready-to-run test files (no placeholders).
