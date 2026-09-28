# Notification categories

Approved controls: all notifications (master), requests including payment/status changes, conversations/calls, advertisements/offers. Choices are per device, persisted server-side under a random 256-bit installation capability stored securely on the device. Master off suppresses delivery without overwriting category choices. Existing inbox history stays available. OS permission is separate and cannot be overridden.

The server stores only the capability digest and FCM token digests. Token bindings survive token rotation through the same device capability. A token already bound to another capability cannot be reassigned. Existing unbound installations retain current delivery behavior for compatibility. The settings screen never claims a failed server save succeeded.

Apply the delivery filter immediately before regular request/call multicast and admin broadcasts. Register/bind each refreshed FCM token before subscribing through existing registration APIs. Existing authorization for requests and lawyer registrations is unchanged. No production migration, deployment or Firebase Console changes in this task.

In-app conversation functionality and saved inbox history are not deleted or disabled. Muting communication notifications prevents push/native incoming-call alerts, not a call manually opened in a conversation. No new message-push system or VoIP implementation is introduced where none currently exists.
