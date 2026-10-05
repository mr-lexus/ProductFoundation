# Product feedback loop

[Русская версия](./product-feedback-loop-RU.md)

Product Foundation already serves as the basis for a real product. That alone
does not prove scale, production traffic or universal suitability. Changes to
the foundation must follow observed requirements and risks.

For each future finding, record this short chain:

```text
Foundation assumption
  → product requirement
  → observed limitation or defect
  → evidence and affected invariant
  → generic foundation improvement OR product-specific solution
```

The record must answer:

1. Which original assumption mattered?
2. Which real requirement or reproducible failure tested it?
3. Does the finding affect security, data integrity, reliability, operations or onboarding?
4. Does the problem recur outside one product's vocabulary or use case?
5. Who should own the solution?
6. Which regression checks demonstrate the improvement?

A generic foundation change needs a real product requirement, reproducible defect,
failed required check, active security issue, demonstrated reliability/operations
problem or concrete onboarding defect. Otherwise, the solution stays in the product.

Add a public “Built with ProductFoundation” or “Real product feedback” section only
with a verifiable link and the product owner's permission. Until then, this document
defines how to collect evidence; it makes no marketing claim.
