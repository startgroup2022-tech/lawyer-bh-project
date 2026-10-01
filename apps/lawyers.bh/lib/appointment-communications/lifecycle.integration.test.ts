import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const configuredUrl = process.env.DATABASE_URL;
const localUrl =
  configuredUrl &&
  ["127.0.0.1", "localhost"].includes(new URL(configuredUrl).hostname)
    ? configuredUrl
    : null;

/**
 * Drives the appointment flow through the real Postgres client and the real
 * route handler: booking side effects, the lawyer accept/start/complete
 * handshake, notifications, and the reminder outbox. These modules import
 * `@/lib/db/client`, so `DATABASE_URL` must point at the isolated local test
 * database.
 */
describe.skipIf(!localUrl)("appointment lifecycle end to end", () => {
  let sql: typeof import("@/lib/db/client")["sqlClient"];
  let bookingId: string;
  let clientId: string;
  let lawyerId: string;
  let clientToken: string;
  let lawyerToken: string;
  const strangerIds: string[] = [];
  const extraBookingIds: string[] = [];

  beforeAll(async () => {
    process.env.CLIENT_AUTH_SECRET ||= "integration-test-client-secret-value";
    process.env.LAWYER_AUTH_SECRET ||= "integration-test-lawyer-secret-value";
    ({ sqlClient: sql } = await import("@/lib/db/client"));

    clientId = randomUUID();
    lawyerId = randomUUID();
    bookingId = randomUUID();
    clientToken = randomUUID().replaceAll("-", "").padEnd(64, "0");
    const { createMobileLawyerToken } = await import("@/lib/mobile-lawyer-auth");
    lawyerToken = createMobileLawyerToken(lawyerId, "BH");

    await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone,is_active)
      VALUES(${clientId},${`it-${clientId}@example.com`},'IT Client','+97336000000',true)`;
    await sql`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at)
      VALUES(encode(sha256(${clientToken}::bytea),'hex'),${clientId},now()+interval '1 day')`;
    await sql`INSERT INTO bahrain_lawyers(id,full_name,full_name_ar,full_name_en,registration_no,phone,membership_no,status,subscription_type,profile_status)
      VALUES(${lawyerId},'IT Lawyer','محامي','IT Lawyer',${`IT-${lawyerId}`},'+97337000000',${`MEM-${lawyerId}`},'approved','lawyer','published')`;
  });

  afterAll(async () => {
    if (!sql) return;
    for (const id of [bookingId, ...extraBookingIds]) {
      await sql`DELETE FROM bahrain_appointment_notifications WHERE booking_request_id=${id}`;
      await sql`DELETE FROM bahrain_appointment_reminder_outbox WHERE booking_request_id=${id}`;
      await sql`DELETE FROM bahrain_appointment_slots WHERE booking_request_id=${id}`;
      await sql`DELETE FROM bahrain_appointment_conversations WHERE booking_request_id=${id}`;
      await sql`DELETE FROM bahrain_booking_requests WHERE id=${id}`;
    }
    await sql`DELETE FROM mobile_client_sessions WHERE client_id=${clientId}`;
    await sql`DELETE FROM mobile_client_accounts WHERE id=${clientId}`;
    await sql`DELETE FROM bahrain_lawyers WHERE id=${lawyerId}`;
    for (const id of strangerIds) {
      await sql`DELETE FROM mobile_client_sessions WHERE client_id=${id}`;
      await sql`DELETE FROM mobile_client_accounts WHERE id=${id}`;
    }
    await sql.end();
  });

  /** Inserts a booking row with a matching slot so the cancel flow can run. */
  async function seedBooking(status: string, date: string): Promise<string> {
    const id = randomUUID();
    extraBookingIds.push(id);
    await sql`INSERT INTO bahrain_booking_requests(
        id,lang,service,consultation_type,consultation_method,consultation_price,amount_bd,
        duration_minutes,appointment_date,appointment_time,assignment_mode,
        selected_lawyer_id,selected_lawyer_name,assigned_to_email,
        customer_name,customer_phone,customer_email,payment_status,admin_status,
        request_payload,country_code,client_account_id)
      VALUES(${id},'en','Consultation','paid','video','50',50,30,${date},'09:30','selected',
        ${lawyerId},'IT Lawyer',${`it-${lawyerId}@example.com`},
        'IT Client','+97336000000',${`it-${clientId}@example.com`},'paid',${status},
        ${JSON.stringify({ source: "integration-test" })}::jsonb,'BH',${clientId})`;
    await sql`INSERT INTO bahrain_appointment_slots(
        country_code,lawyer_id,booking_request_id,appointment_date,start_time,end_time,status)
      VALUES('BH',${lawyerId},${id},${date},'09:30','10:00','booked')`;
    const { ensureAppointmentConversation } = await import("./access");
    await ensureAppointmentConversation(id);
    return id;
  }

  const clientCancel = (id: string) =>
    import("@/app/api/mobile/client-appointments/[bookingId]/route").then(({ DELETE }) =>
      DELETE(
        new Request(`https://test.lawyers.bh/api/mobile/client-appointments/${id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${clientToken}`, "content-type": "application/json" },
          body: JSON.stringify({ reason: "integration test" }),
        }),
        { params: Promise.resolve({ bookingId: id }) },
      ),
    );

  const lifecycle = (action: string, token: string) =>
    import("@/app/api/mobile/appointments/[bookingId]/lifecycle/route").then(({ PATCH }) =>
      PATCH(
        new Request(`https://test.lawyers.bh/api/mobile/appointments/${bookingId}/lifecycle`, {
          method: "PATCH",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }),
        { params: Promise.resolve({ bookingId }) },
      ),
    );

  it("books an appointment and creates its conversation", async () => {
    await sql`INSERT INTO bahrain_booking_requests(
        id,lang,service,consultation_type,consultation_method,consultation_price,amount_bd,
        duration_minutes,appointment_date,appointment_time,assignment_mode,
        selected_lawyer_id,selected_lawyer_name,assigned_to_email,
        customer_name,customer_phone,customer_email,payment_status,admin_status,
        request_payload,country_code,client_account_id)
      VALUES(${bookingId},'en','Consultation','paid','video','50',50,30,'2026-03-01','09:30','selected',
        ${lawyerId},'IT Lawyer',${`it-${lawyerId}@example.com`},
        'IT Client','+97336000000',${`it-${clientId}@example.com`},'paid','approved',
        ${JSON.stringify({ source: "integration-test" })}::jsonb,'BH',${clientId})`;

    const { ensureAppointmentConversation } = await import("./access");
    const conversationId = await ensureAppointmentConversation(bookingId);
    expect(conversationId).toBeTruthy();

    const [row] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM bahrain_appointment_conversations WHERE booking_request_id=${bookingId}`;
    expect(row.count).toBe("1");
  });

  it("notifies both parties when the appointment is booked", async () => {
    const { notifyAppointmentBooked } = await import("./notifications");
    await notifyAppointmentBooked(bookingId);

    const rows = await sql<{ kind: string; recipient_role: string; recipient_id: string; deep_link: string | null }[]>`
      SELECT kind, recipient_role, recipient_id, deep_link FROM bahrain_appointment_notifications
      WHERE booking_request_id=${bookingId} ORDER BY recipient_role`;
    expect(rows).toEqual([
      expect.objectContaining({ kind: "booking_created", recipient_role: "client", recipient_id: clientId }),
      expect.objectContaining({ kind: "booking_created", recipient_role: "lawyer", recipient_id: lawyerId }),
    ]);
    for (const row of rows) {
      expect(row.deep_link).toBe(`lawyersbh://appointments/${bookingId}`);
    }
  });

  it("does not duplicate a notification when the same event is delivered twice", async () => {
    const { notifyAppointmentBooked } = await import("./notifications");
    await notifyAppointmentBooked(bookingId);

    const [row] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM bahrain_appointment_notifications
      WHERE booking_request_id=${bookingId} AND kind='booking_created'`;
    expect(row.count).toBe("2");
  });

  it("lets the assigned lawyer accept, start, and complete the appointment", async () => {
    // The client is a participant, but accepting is not a client transition.
    expect((await lifecycle("accept", clientToken)).status).toBe(409);

    const accept = await lifecycle("accept", lawyerToken);
    expect(accept.status).toBe(200);
    expect(await accept.json()).toMatchObject({ ok: true, status: "confirmed" });

    const start = await lifecycle("start", lawyerToken);
    expect(await start.json()).toMatchObject({ ok: true, status: "in_progress" });

    const complete = await lifecycle("complete", lawyerToken);
    expect(await complete.json()).toMatchObject({ ok: true, status: "completed" });

    const [row] = await sql<{ admin_status: string; completed_at: Date | null; started_at: Date | null }[]>`
      SELECT admin_status, completed_at, started_at FROM bahrain_booking_requests WHERE id=${bookingId}`;
    expect(row.admin_status).toBe("completed");
    expect(row.started_at).not.toBeNull();
    expect(row.completed_at).not.toBeNull();
  });

  it("refuses to complete an appointment that never started", async () => {
    const freshId = randomUUID();
    await sql`INSERT INTO bahrain_booking_requests(
        id,lang,service,consultation_type,consultation_method,consultation_price,amount_bd,
        duration_minutes,appointment_date,appointment_time,assignment_mode,
        selected_lawyer_id,selected_lawyer_name,assigned_to_email,
        customer_name,customer_phone,customer_email,payment_status,admin_status,
        request_payload,country_code,client_account_id)
      VALUES(${freshId},'en','Consultation','paid','video','50',50,30,'2026-03-02','10:00','selected',
        ${lawyerId},'IT Lawyer',${`it-${lawyerId}@example.com`},
        'IT Client','+97336000000',${`it-${clientId}@example.com`},'paid','confirmed',
        ${JSON.stringify({ source: "integration-test" })}::jsonb,'BH',${clientId})`;
    try {
      const { ensureAppointmentConversation } = await import("./access");
      await ensureAppointmentConversation(freshId);
      const { PATCH } = await import("@/app/api/mobile/appointments/[bookingId]/lifecycle/route");
      const response = await PATCH(
        new Request(`https://test.lawyers.bh/api/mobile/appointments/${freshId}/lifecycle`, {
          method: "PATCH",
          headers: { authorization: `Bearer ${lawyerToken}`, "content-type": "application/json" },
          body: JSON.stringify({ action: "complete" }),
        }),
        { params: Promise.resolve({ bookingId: freshId }) },
      );
      expect(response.status).toBe(409);
      const [row] = await sql<{ admin_status: string }[]>`
        SELECT admin_status FROM bahrain_booking_requests WHERE id=${freshId}`;
      expect(row.admin_status).toBe("confirmed");
    } finally {
      await sql`DELETE FROM bahrain_appointment_conversations WHERE booking_request_id=${freshId}`;
      await sql`DELETE FROM bahrain_booking_requests WHERE id=${freshId}`;
    }
  });

  it("writes the completion notification for both parties", async () => {
    const kinds = await sql<{ kind: string; recipient_role: string }[]>`
      SELECT kind, recipient_role FROM bahrain_appointment_notifications
      WHERE booking_request_id=${bookingId} ORDER BY created_at, recipient_role`;
    expect(kinds).toEqual([
      expect.objectContaining({ kind: "booking_created", recipient_role: "client" }),
      expect.objectContaining({ kind: "booking_created", recipient_role: "lawyer" }),
      expect.objectContaining({ kind: "lawyer_accepted", recipient_role: "client" }),
      expect.objectContaining({ kind: "appointment_completed", recipient_role: "client" }),
      expect.objectContaining({ kind: "appointment_completed", recipient_role: "lawyer" }),
    ]);
  });

  it("schedules reminders for an upcoming appointment and cancels them on completion", async () => {
    const upcomingId = randomUUID();
    const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await sql`INSERT INTO bahrain_booking_requests(
        id,lang,service,consultation_type,consultation_method,consultation_price,amount_bd,
        duration_minutes,appointment_date,appointment_time,assignment_mode,
        selected_lawyer_id,selected_lawyer_name,assigned_to_email,
        customer_name,customer_phone,customer_email,payment_status,admin_status,
        request_payload,country_code,client_account_id)
      VALUES(${upcomingId},'en','Consultation','paid','video','50',50,30,${date},'09:30','selected',
        ${lawyerId},'IT Lawyer',${`it-${lawyerId}@example.com`},
        'IT Client','+97336000000',${`it-${clientId}@example.com`},'paid','confirmed',
        ${JSON.stringify({ source: "integration-test" })}::jsonb,'BH',${clientId})`;
    try {
      const { scheduleAppointmentReminders } = await import("./reminder-store");
      await scheduleAppointmentReminders(upcomingId);

      const planned = await sql<{ reminder_kind: string; status: string }[]>`
        SELECT reminder_kind, status FROM bahrain_appointment_reminder_outbox
        WHERE booking_request_id=${upcomingId} ORDER BY due_at`;
      expect(planned.map((reminder) => reminder.reminder_kind)).toEqual([
        "reminder_24h",
        "reminder_1h",
        "reminder_15m",
        "starting",
      ]);
      expect(planned.every((reminder) => reminder.status === "pending")).toBe(true);

      await sql`UPDATE bahrain_booking_requests SET admin_status='cancelled', cancelled_at=now() WHERE id=${upcomingId}`;
      await scheduleAppointmentReminders(upcomingId);

      const cancelled = await sql<{ status: string }[]>`
        SELECT status FROM bahrain_appointment_reminder_outbox WHERE booking_request_id=${upcomingId}`;
      expect(cancelled.every((reminder) => reminder.status === "cancelled")).toBe(true);
    } finally {
      await sql`DELETE FROM bahrain_appointment_reminder_outbox WHERE booking_request_id=${upcomingId}`;
      await sql`DELETE FROM bahrain_booking_requests WHERE id=${upcomingId}`;
    }
  });

  it("refuses a client that does not own the appointment", async () => {
    const strangerId = randomUUID();
    const strangerToken = randomUUID().replaceAll("-", "").padEnd(64, "1");
    strangerIds.push(strangerId);
    await sql`INSERT INTO mobile_client_accounts(id,email,full_name,phone,is_active)
      VALUES(${strangerId},${`it-${strangerId}@example.com`},'IT Stranger','+97336111111',true)`;
    await sql`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at)
      VALUES(encode(sha256(${strangerToken}::bytea),'hex'),${strangerId},now()+interval '1 day')`;

    const response = await lifecycle("cancel", strangerToken);
    expect(response.status).toBe(403);
    const [row] = await sql<{ admin_status: string }[]>`
      SELECT admin_status FROM bahrain_booking_requests WHERE id=${bookingId}`;
    expect(row.admin_status).toBe("completed");
  });

  it("cancels a client appointment, releases the slot, and notifies the lawyer", async () => {
    const id = await seedBooking("approved", "2027-01-05");
    const { scheduleAppointmentReminders } = await import("./reminder-store");
    await scheduleAppointmentReminders(id);

    const response = await clientCancel(id);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "cancelled" });

    const [booking] = await sql<{ admin_status: string; cancelled_at: Date | null }[]>`
      SELECT admin_status, cancelled_at FROM bahrain_booking_requests WHERE id=${id}`;
    expect(booking.admin_status).toBe("cancelled");
    expect(booking.cancelled_at).not.toBeNull();

    const [slot] = await sql<{ status: string }[]>`
      SELECT status FROM bahrain_appointment_slots WHERE booking_request_id=${id}`;
    expect(slot.status).toBe("cancelled");

    const reminders = await sql<{ status: string }[]>`
      SELECT status FROM bahrain_appointment_reminder_outbox WHERE booking_request_id=${id}`;
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.every((reminder) => reminder.status === "cancelled")).toBe(true);

    const notified = await sql<{ recipient_role: string }[]>`
      SELECT recipient_role FROM bahrain_appointment_notifications
      WHERE booking_request_id=${id} AND kind='appointment_cancelled'`;
    // The cancelling client is not told about their own action.
    expect(notified.map((row) => row.recipient_role)).toEqual(["lawyer"]);
  });

  it("does not cancel an appointment that already completed", async () => {
    const id = await seedBooking("completed", "2027-01-06");

    const response = await clientCancel(id);
    expect(response.status).toBe(404);

    const [booking] = await sql<{ admin_status: string }[]>`
      SELECT admin_status FROM bahrain_booking_requests WHERE id=${id}`;
    expect(booking.admin_status).toBe("completed");
    const [slot] = await sql<{ status: string }[]>`
      SELECT status FROM bahrain_appointment_slots WHERE booking_request_id=${id}`;
    expect(slot.status).toBe("booked");
  });

  it("lists a recipient's notifications and marks them read", async () => {
    const { listAppointmentNotifications, markAppointmentNotificationsRead } = await import(
      "./notification-store"
    );

    const clientPage = await listAppointmentNotifications({
      recipientRole: "client",
      recipientId: clientId,
      filter: "all",
    });
    // The client owns the seeded booking and the two notifications from the
    // cancelled appointment above; it never sees the lawyer's rows.
    expect(clientPage.items.length).toBeGreaterThan(0);
    expect(clientPage.unreadCount).toBeGreaterThan(0);
    expect(clientPage.items.every((item) => item.kind !== undefined)).toBe(true);

    const lawyerPage = await listAppointmentNotifications({
      recipientRole: "lawyer",
      recipientId: lawyerId,
      filter: "all",
    });
    const lawyerIds = new Set(lawyerPage.items.map((item) => item.id));
    expect(clientPage.items.some((item) => lawyerIds.has(item.id))).toBe(false);

    const unreadBefore = await listAppointmentNotifications({
      recipientRole: "client",
      recipientId: clientId,
      filter: "unread",
    });
    expect(unreadBefore.items.length).toBe(unreadBefore.unreadCount);

    const updated = await markAppointmentNotificationsRead({
      recipientRole: "client",
      recipientId: clientId,
      readThrough: clientPage.snapshotAt,
    });
    expect(updated).toBe(unreadBefore.items.length);

    const unreadAfter = await listAppointmentNotifications({
      recipientRole: "client",
      recipientId: clientId,
      filter: "unread",
    });
    expect(unreadAfter.unreadCount).toBe(0);
  });
});
