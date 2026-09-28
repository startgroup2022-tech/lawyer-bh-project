import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { createViewingHandlers } from "./http";
import { viewingRepository } from "./repository";
import { createViewingService } from "./service";

const service = createViewingService(viewingRepository);

export const viewingHandlers = createViewingHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  listPublicSlots: service.listPublicSlots,
  bookPublicAppointment: service.bookPublicAppointment,
  createSlot: service.createSlot,
  listSlots: service.listSlots,
  updateSlot: service.updateSlot,
  listAppointments: service.listAppointments,
  updateAppointmentStatus: service.updateAppointmentStatus,
});
