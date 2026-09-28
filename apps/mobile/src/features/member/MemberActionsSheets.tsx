import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import type { Member, MyWorkspace } from '@klokka/api-client';
import { useRemoveMember, useResendInvitation, useUpdateMember } from '@/data/workspace';
import { useT } from '@/i18n/LocaleProvider';
import { problemMessage } from '@/lib/problems';
import { useTheme } from '@/theme';
import { AppSheet, AppText, Button, Card, Row, Separator, TextField, useToast, type SheetHandle } from '@/ui';
import { parseRate } from '@/features/employees/AddEmployeeSheet';

export interface MemberActionsHandle {
  present: () => void;
}

// Member management (CHQ-116): edit rate, deactivate, reactivate, remove, resend the invitation.
// One actions sheet; the rate and the removal confirmation open as their own sheets.
export const MemberActionsSheets = forwardRef<
  MemberActionsHandle,
  { workspace: MyWorkspace; member: Member | undefined; membershipId: string; onRemoved: () => void }
>(function MemberActionsSheets({ workspace, member, membershipId, onRemoved }, ref) {
  const t = useT();
  const theme = useTheme();
  const toast = useToast();
  const updateMember = useUpdateMember(workspace.workspaceId);
  const removeMember = useRemoveMember(workspace.workspaceId);
  const resend = useResendInvitation(workspace.workspaceId);
  const actionsSheet = useRef<SheetHandle>(null);
  const rateSheet = useRef<SheetHandle>(null);
  const removeSheet = useRef<SheetHandle>(null);
  const [rate, setRate] = useState('');
  useImperativeHandle(ref, () => ({ present: () => actionsSheet.current?.present() }));
  const name = member?.displayName ?? '';
  const status = member?.status;

  const act = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast.show(message);
      actionsSheet.current?.dismiss();
      rateSheet.current?.dismiss();
      removeSheet.current?.dismiss();
    } catch (e) {
      toast.show(await problemMessage(e, t), 'danger');
    }
  };
  // The native sheet is modal: the next one opens after the first has gone.
  const swap = (next: React.RefObject<SheetHandle | null>) => {
    actionsSheet.current?.dismiss();
    setTimeout(() => next.current?.present(), 250);
  };

  return (
    <>
      <AppSheet ref={actionsSheet} title={name} closeLabel={t('common.close')} testID="member-actions-sheet">
        <Card>
          {workspace.showPay ? (
            <>
              <Row
                title={t('employees.editRate')}
                icon="edit"
                value={
                  member?.hourlyRate != null ? `${member.hourlyRate} ${workspace.currency}/h` : undefined
                }
                onPress={() => {
                  setRate(member?.hourlyRate != null ? String(member.hourlyRate) : '');
                  swap(rateSheet);
                }}
                testID="action-rate"
              />
              <Separator />
            </>
          ) : null}
          {status === 'INVITED' ? (
            <>
              <Row
                title={t('common.resend')}
                icon="mail"
                onPress={() =>
                  void act(
                    () => resend.mutateAsync(membershipId),
                    t('employees.invitationResent', { email: member?.email ?? '' }),
                  )
                }
                chevron={false}
                testID="action-resend"
              />
              <Separator />
            </>
          ) : null}
          {status === 'DEACTIVATED' ? (
            <Row
              title={t('employees.reactivate')}
              icon="refresh"
              onPress={() =>
                void act(
                  () => updateMember.mutateAsync({ membershipId, update: { status: 'ACTIVE' } }),
                  t('mobile.members.reactivated', { name }),
                )
              }
              chevron={false}
              testID="action-reactivate"
            />
          ) : (
            <Row
              title={t('employees.deactivate')}
              icon="user"
              onPress={() =>
                void act(
                  () => updateMember.mutateAsync({ membershipId, update: { status: 'DEACTIVATED' } }),
                  t('mobile.members.deactivated', { name }),
                )
              }
              chevron={false}
              testID="action-deactivate"
            />
          )}
          <Separator />
          <Row
            title={t('employees.remove')}
            icon="x"
            danger
            onPress={() => swap(removeSheet)}
            chevron={false}
            testID="action-remove"
          />
        </Card>
      </AppSheet>
      <AppSheet
        ref={rateSheet}
        title={t('employees.editRate')}
        subtitle={t('employees.ratesPrivateHint')}
        closeLabel={t('common.close')}
        testID="rate-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <TextField
            label={t('mobile.members.rateLabel', { name })}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
            suffix={`${workspace.currency}/h`}
            testID="rate-input"
          />
          <Button
            label={t('common.save')}
            disabled={rate.trim() !== '' && parseRate(rate) === null}
            loading={updateMember.isPending}
            onPress={() =>
              void act(
                () => updateMember.mutateAsync({ membershipId, update: { hourlyRate: parseRate(rate) } }),
                t('mobile.members.rateSaved'),
              )
            }
            testID="rate-save"
          />
        </View>
      </AppSheet>
      <AppSheet
        ref={removeSheet}
        title={t('employees.remove')}
        closeLabel={t('common.close')}
        testID="remove-sheet"
      >
        <View style={{ gap: theme.space[4] }}>
          <AppText tone="muted">
            {t('mobile.members.removeConfirm', { name, workspace: workspace.name })}
          </AppText>
          <Button
            label={t('employees.remove')}
            variant="danger"
            icon="x"
            loading={removeMember.isPending}
            hapticKind="warning"
            onPress={() =>
              void act(
                async () => {
                  await removeMember.mutateAsync(membershipId);
                  onRemoved();
                },
                t('mobile.members.removed', { name }),
              )
            }
            testID="remove-confirm"
          />
        </View>
      </AppSheet>
    </>
  );
});
