import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createMeetingRoomHandlers } from "@/lib/saraya/meeting-rooms/http";
import { meetingRoomRepository } from "@/lib/saraya/meeting-rooms/repository";
import { createMeetingRoomService } from "@/lib/saraya/meeting-rooms/service";

const service = createMeetingRoomService(meetingRoomRepository);
const handlers = createMeetingRoomHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  listRooms: service.listRooms,
  createRoom: service.createRoom,
  updateRoom: service.updateRoom,
  listBookings: service.listBookings,
  listBookingTargets: service.listBookingTargets,
  createBooking: service.createBooking,
  decideBooking: service.decideBooking,
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handlers.updateRoom(request, (await context.params).id);
}
