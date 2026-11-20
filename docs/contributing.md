# Contributing

Start from Forgejo `main` and use a short phase branch. Review the delivery queue for ownership and acceptance checks. Keep production content and test-only reference choices in their respective directories. Use targeted tests while editing and run the full checks before review.

Open the phase pull request in Forgejo. Include the tickets covered, verification commands and their results, and outstanding checks. GitHub mirrors the merged `main` commit and runs CI. The Forgejo commit and the mirror CI result are tracked separately. [Repository workflow](../AGENTS.md) · [Delivery queue](../plan/01-delivery.md)

For ordinary bugs, use the issue form or include the browser, level, reproduction steps and expected result. For a vulnerability, contact the repository owner privately through an established channel. Keep exploit details and affected exports out of public issues. A dedicated security contact is pending owner confirmation.
