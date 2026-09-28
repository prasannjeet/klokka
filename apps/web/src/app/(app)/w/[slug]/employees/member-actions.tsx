'use client';

import type { Member } from '@klokka/api-client';
import type { IsoMonth } from '@klokka/core';
import type { WorkspaceView } from '@/lib/workspace';

// Rate, deactivate, reactivate and withdraw arrive with CHQ-116.
export function MemberActions(_props: { ws: WorkspaceView; member: Member; month: IsoMonth }) {
  return null;
}
