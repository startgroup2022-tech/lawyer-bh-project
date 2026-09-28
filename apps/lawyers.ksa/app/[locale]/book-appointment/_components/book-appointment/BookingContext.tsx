"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { useBookAppointmentState } from "./useBookAppointmentState";

export type BookingContextValue = ReturnType<typeof useBookAppointmentState>;

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({
  value,
  children,
}: {
  value: BookingContextValue;
  children: ReactNode;
}) {
  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error("useBooking must be used inside BookingProvider");
  }

  return context;
}
