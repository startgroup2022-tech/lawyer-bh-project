export function serializeInvitationSpecialties(
  specialtyMain: string,
  specialtySubs: string[],
) {
  return {
    specialtySubsJson: JSON.stringify(specialtySubs),
    specialtiesJson: JSON.stringify({
      main: specialtyMain,
      subs: specialtySubs,
    }),
  };
}

export function serializeInvitationTimestamps(
  invitedAt: Date,
  inviteTokenExpiresAt: Date,
) {
  return {
    invitedAtIso: invitedAt.toISOString(),
    inviteTokenExpiresAtIso: inviteTokenExpiresAt.toISOString(),
  };
}
