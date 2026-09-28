# SOS Dispatch and Message Push Design

## Goal

Deliver reliable push notifications for the five-minute lawyer offer and for chat messages in both directions, while automatically advancing an expired request to the next nearest eligible lawyer or escalating it to administration.

## Dispatch flow

The client first reviews a candidate. Only after the client approves that candidate does the server create a five-minute lawyer offer and send `lawyer_offer` to that lawyer. The server owns the absolute deadline; the app only renders the remaining duration returned by the server.

If the lawyer accepts before the deadline, the request is assigned once and communication opens. If the deadline passes, an idempotent expiry worker marks that candidate excluded, clears the pending offer, sends `lawyer_offer_expired` to the lawyer, selects the next nearest eligible non-excluded lawyer, and exposes that candidate to the client for approval. The next lawyer is not notified until the client approves them.

If no candidate remains, the request enters `awaiting_on_call_assignment`. An administration escalation record is created once and an urgent admin notification is emitted so an on-call lawyer can be assigned manually. The client sees that administration is arranging an on-call lawyer.

## Message flow

After a message is durably inserted, the route sends `new_message` to the opposite participant only. A client message targets the assigned lawyer installation. A lawyer message targets installations subscribed to that request. The payload contains only event type and request ID; message text and personal data are not included in push data.

Push delivery is best-effort after durable state changes. A Firebase outage must not roll back an accepted request or stored message. Duplicate message submissions and repeated expiry-worker runs must not create duplicate pushes or escalations.

## Local verification

Vitest covers offer timing, expiry idempotency, nearest-next selection, admin fallback, and both message directions. Flutter tests cover event parsing, foreground presentation, tap navigation, and the five-minute countdown driven by the server deadline. TypeScript and Flutter analysis run locally. No Git push, Vercel deployment, or TestFlight upload is performed.
