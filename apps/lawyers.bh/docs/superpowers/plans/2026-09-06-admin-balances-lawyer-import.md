# Admin balances and lawyer import implementation plan

1. Add focused tests for shadow-free provider cards, admin dashboard navigation, balance validation/filtering, and row-level lawyer import results.
2. Extract reusable invitation creation logic from the single-lawyer route without changing its response contract.
3. Add Excel parsing and an authenticated bulk-import API with limits, normalization, duplicate detection, partial success, email delivery, and detailed results.
4. Add the styled RTL/LTR lawyer upload page and downloadable template.
5. Add authenticated admin balance APIs for listing/history, creation, link generation, cancellation, invoice, and receipt access using the existing balance table.
6. Add the styled RTL/LTR admin balance page with search, filters, totals, history, and creation controls.
7. Add both admin dashboard cards and remove provider navigation-card shadows.
8. Run focused tests, type checking, safe Next build, and inspect the final diff while excluding Saraya files.
