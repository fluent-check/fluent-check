# Change: Add Additional Regex Pattern Presets

> **GitHub Issue:** [#433](https://github.com/fluent-check/fluent-check/issues/433)

## Why

The current `patterns` object provides generators for email, uuid, ipv4, and url formats. Users frequently need generators for other common data formats like phone numbers, credit cards, dates, and postal codes. Adding these presets reduces boilerplate and ensures consistent, valid test data generation.

## What Changes

- Add `patterns.phone()` for US phone number format
- Add `patterns.phoneInternational()` for E.164 international format
- Add `patterns.creditCard()` for Luhn-valid credit card numbers
- Add `patterns.isoDate()` for ISO 8601 date strings
- Add `patterns.isoDateTime()` for ISO 8601 datetime strings
- Add `patterns.ssn()` for US Social Security Number format
- Add `patterns.zipCode()` for US ZIP code format (5-digit and ZIP+4)
- Add `patterns.slug()` for URL slug format

## Impact

- Affected specs: `arbitraries`
- Affected code: `src/arbitraries/regex.ts`
- Breaking changes: None (additive only)
