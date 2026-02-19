import type { AuthUserDto } from '@nms/shared';
import type { SessionUser } from './session';

export function toAuthUserDto(session: NonNullable<SessionUser>): AuthUserDto {
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    emailVerifiedAt: session.user.emailVerifiedAt?.toISOString() ?? null,
    groups: session.user.groupMemberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      roleInGroup: membership.roleInGroup,
    })),
  };
}
