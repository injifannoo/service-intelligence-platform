# Coding Standards Document

Version: 1.0

---

# Table of Contents

1. Purpose
2. General Principles
3. Code Quality Rules
4. Backend Standards
5. Frontend Standards
6. AI Engineering Standards
7. Database Standards
8. Git Standards
9. Code Review Rules
10. Documentation Rules

---

# 1. Purpose

This document defines coding rules to ensure the platform remains:

- Maintainable
- Secure
- Scalable
- Easy for developers to understand

All developers and AI coding assistants must follow these standards.

---

# 2. General Principles

## Clean Code

Code should be:

- Simple
- Readable
- Well structured
- Easy to modify

---

## SOLID Principles

Follow:

- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

---

## DRY Principle

Do not repeat code.

Create reusable:

- Functions
- Components
- Services
- Utilities

---

## KISS Principle

Prefer simple solutions over unnecessary complexity.

---

# 3. Code Quality Rules

Every code change should:

- Solve one clear problem
- Include testing
- Have meaningful names
- Avoid unnecessary comments
- Follow project architecture

---

# 4. Backend Coding Standards

Technology:

```
Python

Django

Django REST Framework
```

---

# Python Standards


Follow:

- PEP 8
- Type hints
- Clear naming


Example:


Good:

```python
def calculate_rating_score(reviews):
    pass
```


Bad:

```python
def crs(x):
    pass
```

---

# Django Structure


Use modular apps:


```
apps/

users/

organizations/

reviews/

services/
```


Do not create one huge application.

---

# Backend Layers


Follow:


```
API View

↓

Serializer

↓

Service Layer

↓

Repository

↓

Database
```


---

# Views Rule

Views should only handle:

- Request
- Response
- Validation


Business logic belongs in services.

---

Example:


Bad:


```python
class OrganizationView:

    calculate_score()
    update_database()
    send_email()
```


Good:


```
OrganizationView

↓

OrganizationService
```

---

# Models Rules


Models contain:

- Data structure
- Relationships
- Simple validation


Avoid putting complex business logic inside models.

---

# API Rules


Every API must have:

- Authentication
- Validation
- Error handling
- Documentation
- Tests

---

# 5. Frontend Coding Standards

Technology:

```
Next.js

TypeScript

React

Tailwind CSS
```

---

# Component Rules


Components should:

- Have one responsibility
- Be reusable
- Avoid unnecessary complexity


Example:


```
components/

Button

Card

Modal

SearchBox
```

---

# Feature-Based Structure


Use:


```
features/

authentication/

organization/

search/

reviews/
```


Each feature contains:


```
components

hooks

services

types
```

---

# TypeScript Rules


Avoid:


```typescript
any
```


Prefer:


```typescript
interface Organization {

id:number;

name:string;

}
```

---

# State Management


Use:

## React Query

For:

- API data
- Server state


## Zustand

For:

- Application state


---

# Styling Rules


Use:

- Tailwind CSS
- Reusable UI components


Avoid:

- Large CSS files
- Duplicate styles

---

# 6. AI Engineering Standards

AI code must follow:


## Reproducibility

Every AI result should be traceable.


Store:

- Input
- Model
- Version
- Output


---

## Prompt Management


Do not hardcode prompts.


Use:


```
ai-engine/

prompts/

summarization.txt

recommendation.txt
```

---

## Model Documentation


Every model requires:


```
Purpose

Input

Output

Accuracy

Limitations
```

---

## AI Safety


AI output must:

- Be reviewed
- Avoid false claims
- Protect user privacy

---

# 7. Database Standards


## Naming


Tables:

plural


Example:


```
users

organizations

reviews
```


---

Columns:


snake_case


Example:


```
created_at

updated_at
```

---

# Primary Keys


Use:


```
UUID
```


instead of:

```
Auto increment integer
```

for public-facing entities.

---

# Database Migration


Never modify production database manually.

Always use:


```
migration files
```

---

# 8. Git Standards


## Branch Strategy


```
main

develop

feature/*

bugfix/*

hotfix/*
```


---

# Commit Convention


Use:


```
feat:
fix:
docs:
refactor:
test:
chore:
```


Examples:


```
feat: add organization registration

fix: correct review validation

docs: update API documentation
```

---

# Pull Request Rules


Every PR must include:


- Description
- Screenshots (frontend)
- Testing information
- Related issue


---

# 9. Code Review Rules


Review:

## Functionality

Does it solve the problem?


## Quality

Is the code clean?


## Security

Are there vulnerabilities?


## Performance

Will it scale?


## Maintainability

Can another developer understand it?


---

# 10. Documentation Rules


Every major feature requires:


## Technical Documentation

Explain:

- Purpose
- Architecture
- Usage


---

## API Documentation


Include:

- Endpoint
- Request
- Response
- Errors


---

## Database Documentation


Include:

- Tables
- Relationships
- Changes


---

# AI Assistant Development Rules


When using AI coding assistants:

The AI must:

1. Read project documentation first.
2. Follow existing architecture.
3. Not create duplicate solutions.
4. Explain major changes.
5. Generate tests.
6. Update documentation.

---

# Final Coding Philosophy


Write code that:

- Another engineer can understand.
- Can scale with the company.
- Can be maintained for years.
- Supports future AI capabilities.

---

End of Document