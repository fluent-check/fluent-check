## ADDED Requirements

### Requirement: Phone Number Pattern Generators

The system SHALL provide pre-built generators for phone number formats via `fc.patterns`.

#### Scenario: US phone pattern
- **WHEN** `fc.patterns.phone()` is called
- **THEN** valid US phone number strings in format `(XXX) XXX-XXXX` are generated
- **AND** all digits SHALL be valid (0-9)

#### Scenario: International phone pattern
- **WHEN** `fc.patterns.phoneInternational()` is called
- **THEN** valid E.164 format phone numbers starting with `+` are generated
- **AND** the country code and number SHALL follow E.164 conventions

### Requirement: Credit Card Pattern Generator

The system SHALL provide a generator for credit card numbers via `fc.patterns.creditCard()`.

#### Scenario: Credit card with Luhn validation
- **WHEN** `fc.patterns.creditCard()` is called
- **THEN** 16-digit credit card number strings are generated
- **AND** generated numbers SHALL pass Luhn checksum validation

### Requirement: ISO Date/Time Pattern Generators

The system SHALL provide generators for ISO 8601 date and datetime formats via `fc.patterns`.

#### Scenario: ISO date pattern
- **WHEN** `fc.patterns.isoDate()` is called
- **THEN** valid date strings in format `YYYY-MM-DD` are generated
- **AND** generated dates SHALL be valid calendar dates

#### Scenario: ISO datetime pattern
- **WHEN** `fc.patterns.isoDateTime()` is called
- **THEN** valid datetime strings in ISO 8601 format are generated
- **AND** format SHALL be `YYYY-MM-DDTHH:mm:ssZ` or with timezone offset

### Requirement: US Identification Pattern Generators

The system SHALL provide generators for common US identification formats via `fc.patterns`.

#### Scenario: SSN pattern
- **WHEN** `fc.patterns.ssn()` is called
- **THEN** valid Social Security Number strings in format `XXX-XX-XXXX` are generated

#### Scenario: ZIP code pattern
- **WHEN** `fc.patterns.zipCode()` is called
- **THEN** valid US ZIP code strings are generated
- **AND** format SHALL be either `XXXXX` or `XXXXX-XXXX` (ZIP+4)

### Requirement: URL Slug Pattern Generator

The system SHALL provide a generator for URL-safe slug strings via `fc.patterns.slug()`.

#### Scenario: slug pattern
- **WHEN** `fc.patterns.slug()` is called
- **THEN** URL-safe slug strings are generated
- **AND** slugs SHALL contain only lowercase letters, numbers, and hyphens
- **AND** slugs SHALL NOT start or end with a hyphen
