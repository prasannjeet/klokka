import { Fragment, forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { Member } from '@klokka/api-client';
import { useT } from '@/i18n/LocaleProvider';
import { useThemedStyles, type Theme } from '@/theme';
import { AppSheet, Avatar, Card, Row, Separator, type SheetHandle } from '@/ui';

export interface PickPersonHandle {
  present: () => void;
}

const styles = (t: Theme) =>
  StyleSheet.create({ list: { paddingVertical: 0, paddingHorizontal: t.space[4] } });

// Who a new job is for (CHQ-191, the team day's New job when more than one person can take it): one row per
// person, the sheet scrolling once the team is longer than the screen. The pick is handed on once the sheet has
// gone, so the editor never opens under a closing modal.
export const PickPersonSheet = forwardRef<
  PickPersonHandle,
  { members: readonly Member[]; onPick: (membershipId: string) => void }
>(function PickPersonSheet({ members, onPick }, ref) {
  const t = useT();
  const s = useThemedStyles(styles);
  const sheet = useRef<SheetHandle>(null);
  const picked = useRef<string | null>(null);
  useImperativeHandle(ref, () => ({
    present: () => {
      picked.current = null;
      sheet.current?.present();
    },
  }));
  return (
    <AppSheet
      ref={sheet}
      title={t('jobs.pickMember')}
      closeLabel={t('common.close')}
      onDismiss={() => {
        const id = picked.current;
        picked.current = null;
        if (id) onPick(id);
      }}
      testID="pick-person-sheet"
    >
      <Card style={s.list}>
        {members.map((member, i) => (
          <Fragment key={member.id}>
            {i > 0 ? <Separator /> : null}
            <Row
              title={member.displayName}
              leading={
                <Avatar
                  name={member.displayName}
                  emoji={member.avatarEmoji}
                  colour={member.status === 'INVITED' ? 'YELLOW' : 'PURPLE'}
                  size={40}
                />
              }
              onPress={() => {
                picked.current = member.id;
                sheet.current?.dismiss();
              }}
              chevron
              testID={`pick-person-${member.id}`}
            />
          </Fragment>
        ))}
      </Card>
    </AppSheet>
  );
});
