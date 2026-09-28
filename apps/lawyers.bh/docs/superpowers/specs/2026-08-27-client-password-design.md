# Approved client signup and password design

The user approved email verification on initial signup, subsequent email/password login, password recovery, and a polished centered signup page.

Signup collects full name, email, national phone with country selector, password and confirmation. The email/name counters are hidden. OS autofill is enabled for identity/contact and password fields; passwords are not stored by the app. Both password fields have show/hide controls. Arabic remains RTL, and colors follow light/dark themes.

The server validates a 8–128-character new password accepting all character types without composition requirements, stores only a salted asynchronous scrypt digest, and binds that digest to a ten-minute email challenge. Accounts are created only when the delivered one-use code is verified. Registering an existing email cannot alter its profile or password.

Login uses generic credential errors, database-backed rate limits and hashed opaque sessions. Recovery collects email plus new password/confirmation, then requires an email code before changing the password and revoking prior sessions. Existing passwordless accounts use this same verified recovery process. Legacy pending OTP-login challenges are rejected.

No lawyer authentication, payment logic or guest request ownership is changed. Deployment, production migrations and actual email/device tests remain separate release steps. Update the server/database before distributing the updated app.
