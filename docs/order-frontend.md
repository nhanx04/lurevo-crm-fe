# Order Frontend

## Routes

- `/app/orders`
- `/app/orders/new`
- `/app/orders/:orderId`
- `/app/orders/:orderId/edit`

The detail and edit routes use the same editable workspace. Backend permissions and workflow state remain authoritative.

## Main Components

Order UI is split under `src/features/orders`:

- `components.tsx`: reusable order table, filters, badges, readiness panel, workflow action bar, add-listing dialog, line cards, item accordions, file slots, shipping label panel, supplier summary, and activity timeline.
- `hooks.ts`: React Query hooks for orders, shops, statuses, listings, readiness, activities, and refresh behavior.
- `orderUtils.ts`: status/action helpers, readiness progress, supplier readiness, file metadata mapping, and display helpers.

Route containers live in `src/pages/orders.tsx`.

## API Client and Query Keys

Order API methods are centralized in `src/api/services.ts` under `orderApi`. Query keys are centralized in `src/api/queryKeys.ts`.

The UI uses the existing Axios envelope handling and React Query mutation patterns. It invalidates only affected order/list queries after writes.

## Order Editor Structure

The order workspace includes:

- sticky order header with status and workflow actions
- backend readiness summary
- product lines and item accordions in the main column
- order information sidebar
- shipping-label panel
- supplier summary panel
- activity timeline

## Listing Selection Flow

The Products section opens an Add Listing modal. The selector supports search, category filter, listing thumbnail, internal SKU, supplier SKU, variant counts, and supplier configuration status. Quantity and personalization mode are submitted to `POST /orders/{orderId}/lines`.

`same` creates one production item with line quantity. `different` creates one item per unit.

## Production Configuration

Item selectors use the order line supplier snapshots. Option, color, print method, and main position are required single selections. Sub position is optional. The UI never offers free-text supplier values.

Small variant sets render as chips. Larger sets use selects. Single-value fields are shown compactly.

## File Upload Flow

The frontend uses file inputs and drag/drop slots. Current backend support stores file metadata through order item file APIs; binary storage upload for order files still needs backend confirmation. Slots include:

- Customer Photos
- Customer References
- Main Design
- Sub Design
- Mockup 1
- Mockup 2
- Additional Design

Main and sub design slots submit explicit selected usages. Additional design is stored separately and is not treated as main by default.

## Shipping Labels

The shipping label panel uploads/replaces the active order-level label using file metadata. Previous label history is displayed from the order detail response. No shipping address fields are shown.

## Readiness

Readiness uses the backend readiness response. The frontend displays percentage, progress, passed count, and failed checks. Failed checks scroll to stable section IDs when possible:

- `shipping-label-section`
- `order-item-{itemId}`
- `supplier-config-{itemId}`

## Supplier Submission

The frontend never calls the supplier API directly. It calls backend order workflow endpoints. Send confirmation displays order ID, shop, products, items, quantity, active label, main/sub design counts, and mockups.

## Permissions

The UI uses the current auth role. Owners see reviewer/supplier actions where applicable. The backend remains authoritative and may reject actions.

## Autosave

Order item text fields autosave with a short debounce:

- personalization text
- customer note
- production notice

Production configuration has an explicit save action.

## Error Handling

Backend errors are shown through toast or inline error states. User-entered draft state is preserved after failed create/save attempts.

## Test Commands

```bash
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

## Known Backend Dependencies

The following APIs are isolated in `orderApi` but may require backend completion:

- `PATCH /orders/{orderId}/lines/{lineId}`
- `GET/PATCH/PUT /order-items/...`
- `PATCH /order-items/bulk`
- item file list/patch/delete endpoints
- shipping-label list/active endpoints if not embedded in order detail
- order activities endpoint
- submit for review, request revision, mark ready, retry supplier, hold, resume, cancel

The current UI uses embedded order detail data where available and surfaces backend errors cleanly for unavailable workflow endpoints.
