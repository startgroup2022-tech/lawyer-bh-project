export function JoinSubmitError({ message }: { message: string }) {
  return (
    <div
      id="join-form-error"
      role="alert"
      className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
