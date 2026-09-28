"use client";

import { useMemo, useState, type ReactNode } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

type LawyerOption = {
  id: string;
  name: string;
  email: string;
};

type ModalKey =
  | "approve"
  | "reject"
  | "complete"
  | "cancel"
  | "appointment"
  | "provider"
  | null;

type Props = {
  isAr: boolean;
  locale: string;
  requestId: string;
  currentStatus: string;
  assignmentMode: string;
  appointmentDate: string;
  appointmentTime: string;
  lawyers: LawyerOption[];
  updateRequestStatusAction: ServerAction;
  updateBookingAppointmentAction: ServerAction;
  updateBookingProviderAction: ServerAction;
};

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function ActionButton({
  children,
  onClick,
  tone = "primary",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "primary" | "success" | "danger" | "warning" | "neutral";
  disabled?: boolean;
}) {
  const className =
    tone === "success"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-300"
      : tone === "danger"
        ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-100 disabled:text-red-300"
        : tone === "warning"
          ? "bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-100 disabled:text-amber-300"
          : tone === "neutral"
            ? "bg-white text-primary ring-1 ring-primary/20 hover:bg-primary hover:text-white disabled:bg-gray-100 disabled:text-gray-400"
            : "bg-primary text-white hover:bg-primary-dark disabled:bg-gray-200 disabled:text-gray-500";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-text-primary">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-extrabold text-text-muted hover:bg-gray-200"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ConfirmCheckbox({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs font-bold leading-6 text-text-muted">
      <input
        type="checkbox"
        name={name}
        value="yes"
        required
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

export default function RequestActionModals({
  isAr,
  locale,
  requestId,
  currentStatus,
  assignmentMode,
  appointmentDate,
  appointmentTime,
  lawyers,
  updateRequestStatusAction,
  updateBookingAppointmentAction,
  updateBookingProviderAction,
}: Props) {
  const [openModal, setOpenModal] = useState<ModalKey>(null);

  const status = normalizeStatus(currentStatus);
  const isPendingReview = status === "pending review";
  const isApproved = status === "approved";
  const isTerminal = ["rejected", "cancelled", "completed"].includes(status);
  const isOfficeRequest = assignmentMode === "office";
  const hasLawyers = lawyers.length > 0;

  const providerButtonLabel = isOfficeRequest
    ? isAr
      ? "إرسال لمحامي"
      : "Send to Lawyer"
    : isAr
      ? "تغيير المحامي"
      : "Change Lawyer";

  const firstLawyerId = useMemo(() => lawyers[0]?.id ?? "", [lawyers]);

  const closeModalAfterSubmit = () => {
    window.setTimeout(() => {
      setOpenModal(null);
    }, 0);
  };

  return (
    <>
      <div className="mt-5 grid gap-2">
        {isPendingReview && (
          <>
            <ActionButton
              tone="success"
              onClick={() => setOpenModal("approve")}
            >
              {isAr ? "اعتماد الطلب" : "Approve Request"}
            </ActionButton>

            <ActionButton
              tone="danger"
              onClick={() => setOpenModal("reject")}
            >
              {isAr ? "رفض الطلب" : "Reject Request"}
            </ActionButton>
          </>
        )}

        {isApproved && (
          <>
            <ActionButton
              tone="warning"
              onClick={() => setOpenModal("appointment")}
            >
              {isAr ? "تعديل الموعد" : "Change Appointment"}
            </ActionButton>

            <ActionButton
              tone="success"
              onClick={() => setOpenModal("complete")}
            >
              {isAr ? "مكتمل" : "Completed"}
            </ActionButton>

            <ActionButton
              tone="danger"
              onClick={() => setOpenModal("cancel")}
            >
              {isAr ? "إلغاء الطلب" : "Cancel Request"}
            </ActionButton>
          </>
        )}

        {!isTerminal && (
          <ActionButton
            tone="primary"
            onClick={() => setOpenModal("provider")}
            disabled={!hasLawyers}
          >
            {hasLawyers
              ? providerButtonLabel
              : isAr
                ? "لا يوجد محامون متاحون"
                : "No lawyers available"}
          </ActionButton>
        )}

        {isTerminal && (
          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-text-muted">
            {isAr
              ? "هذا الطلب في حالة نهائية ولا يمكن تغييره."
              : "This request is in a final state and cannot be changed."}
          </div>
        )}
      </div>

      <Modal
        open={openModal === "approve"}
        title={isAr ? "اعتماد الطلب" : "Approve Request"}
        description={
          isAr
            ? "هل أنت متأكد من اعتماد هذا الطلب؟ بعد الاعتماد لن يمكن إرجاعه إلى بانتظار المراجعة."
            : "Are you sure you want to approve this request? After approval, it cannot be returned to pending review."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateRequestStatusAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="source" value="booking" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="status" value="approved" />
          <ConfirmCheckbox
            name="confirmStatus"
            label={
              isAr
                ? "أوافق على اعتماد هذا الطلب."
                : "I confirm approving this request."
            }
          />
          <button
            type="submit"
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            {isAr ? "تأكيد الاعتماد" : "Confirm Approval"}
          </button>
        </form>
      </Modal>

      <Modal
        open={openModal === "reject"}
        title={isAr ? "رفض الطلب" : "Reject Request"}
        description={
          isAr
            ? "يجب كتابة سبب الرفض قبل تنفيذ الإجراء."
            : "A rejection reason is required before applying this action."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateRequestStatusAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="source" value="booking" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="status" value="rejected" />

          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-text-muted">
              {isAr ? "سبب الرفض" : "Rejection Reason"}
            </span>
            <textarea
              name="reason"
              required
              minLength={3}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-text-primary outline-none focus:border-primary"
            />
          </label>

          <ConfirmCheckbox
            name="confirmStatus"
            label={
              isAr
                ? "أوافق وأؤكد رفض هذا الطلب."
                : "I confirm rejecting this request."
            }
          />

          <button
            type="submit"
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700"
          >
            {isAr ? "تأكيد الرفض" : "Confirm Rejection"}
          </button>
        </form>
      </Modal>

      <Modal
        open={openModal === "complete"}
        title={isAr ? "مكتمل" : "Completed"}
        description={
          isAr
            ? "هل أنت متأكد من تحويل حالة الطلب إلى مكتمل؟ سيتم إرسال رابط تقييم المحامي والخدمة وتعليق للعميل عبر البريد الإلكتروني."
            : "Are you sure you want to mark this request as completed? A lawyer/service rating and feedback link will be emailed to the client."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateRequestStatusAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="source" value="booking" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="status" value="completed" />

          <ConfirmCheckbox
            name="confirmStatus"
            label={
              isAr
                ? "أوافق على تحويل هذا الطلب إلى مكتمل وإرسال رابط تقييم المحامي والخدمة للعميل."
                : "I confirm marking this request as completed and sending the lawyer/service review link to the client."
            }
          />

          <button
            type="submit"
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700"
          >
            {isAr ? "تأكيد الإكمال" : "Confirm Completion"}
          </button>
        </form>
      </Modal>

      <Modal
        open={openModal === "cancel"}
        title={isAr ? "إلغاء الطلب" : "Cancel Request"}
        description={
          isAr
            ? "يجب كتابة سبب الإلغاء قبل تنفيذ الإجراء."
            : "A cancellation reason is required before applying this action."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateRequestStatusAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="source" value="booking" />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="status" value="cancelled" />

          <label className="grid gap-1.5">
            <span className="text-xs font-extrabold text-text-muted">
              {isAr ? "سبب الإلغاء" : "Cancellation Reason"}
            </span>
            <textarea
              name="reason"
              required
              minLength={3}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-text-primary outline-none focus:border-primary"
            />
          </label>

          <ConfirmCheckbox
            name="confirmStatus"
            label={
              isAr
                ? "أوافق وأؤكد إلغاء هذا الطلب."
                : "I confirm cancelling this request."
            }
          />

          <button
            type="submit"
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-red-700"
          >
            {isAr ? "تأكيد الإلغاء" : "Confirm Cancellation"}
          </button>
        </form>
      </Modal>

      <Modal
        open={openModal === "appointment"}
        title={isAr ? "تعديل الموعد" : "Change Appointment"}
        description={
          isAr
            ? "عدّل تاريخ أو وقت الموعد ثم أكد الموافقة قبل الحفظ."
            : "Change the appointment date or time, then confirm approval before saving."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateBookingAppointmentAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="locale" value={locale} />

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-text-muted">
              {isAr ? "تاريخ الموعد" : "Appointment Date"}
            </label>
            <input
              name="appointmentDate"
              type="date"
              defaultValue={appointmentDate}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-text-primary outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-text-muted">
              {isAr ? "وقت الموعد" : "Appointment Time"}
            </label>
            <input
              name="appointmentTime"
              type="text"
              defaultValue={appointmentTime}
              placeholder={
                isAr
                  ? "مثال: 12:00 أو 09:00-13:00"
                  : "Example: 12:00 or 09:00-13:00"
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-text-primary outline-none focus:border-primary"
              dir="ltr"
            />
          </div>

          <ConfirmCheckbox
            name="confirmAppointment"
            label={
              isAr
                ? "أوافق على تعديل تاريخ ووقت الموعد."
                : "I approve changing the appointment date and time."
            }
          />

          <button
            type="submit"
            className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-white hover:bg-amber-600"
          >
            {isAr ? "حفظ الموعد" : "Save Appointment"}
          </button>
        </form>
      </Modal>

      <Modal
        open={openModal === "provider"}
        title={providerButtonLabel}
        description={
          isOfficeRequest
            ? isAr
              ? "اختر المحامي الذي تريد إرسال طلب المكتب إليه."
              : "Select the lawyer you want to send this office request to."
            : isAr
              ? "اختر المحامي الجديد لهذا الطلب."
              : "Select the new lawyer for this request."
        }
        onClose={() => setOpenModal(null)}
      >
        <form
          action={updateBookingProviderAction}
          onSubmit={closeModalAfterSubmit}
          className="grid gap-3"
        >
          <input type="hidden" name="id" value={requestId} />
          <input type="hidden" name="locale" value={locale} />

          <div>
            <label className="mb-1.5 block text-xs font-extrabold text-text-muted">
              {isAr ? "اختر المحامي" : "Select Lawyer"}
            </label>
            <select
              name="lawyerId"
              required
              defaultValue={firstLawyerId}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-text-primary outline-none focus:border-primary"
            >
              {lawyers.map((lawyer) => (
                <option key={lawyer.id} value={lawyer.id}>
                  {lawyer.email ? `${lawyer.name} - ${lawyer.email}` : lawyer.name}
                </option>
              ))}
            </select>
          </div>

          <ConfirmCheckbox
            name="confirmProvider"
            label={
              isOfficeRequest
                ? isAr
                  ? "أوافق على إرسال الطلب إلى المحامي المحدد."
                  : "I approve sending the request to the selected lawyer."
                : isAr
                  ? "أوافق على تغيير المحامي لهذا الطلب."
                  : "I approve changing the lawyer for this request."
            }
          />

          <button
            type="submit"
            className="rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-white hover:bg-primary-dark"
          >
            {isOfficeRequest
              ? isAr
                ? "إرسال للمحامي"
                : "Send to Lawyer"
              : isAr
                ? "تغيير المحامي"
                : "Change Lawyer"}
          </button>
        </form>
      </Modal>
    </>
  );
}
