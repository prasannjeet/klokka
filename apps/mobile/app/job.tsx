import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { JobEditorScreen } from '@/features/jobs/JobEditorScreen';
import { parseJobEditorParams } from '@/features/jobs/jobEditorHref';
import { useT } from '@/i18n/LocaleProvider';
import { useToast } from '@/ui';

// The job editor page (CHQ-185): `/job?membershipId=..&date=..&mode=single|full|edit[&jobId=..]`. A link with
// missing or malformed params goes back with a message instead of opening an editor for nothing.
export default function JobRoute() {
  const params = useLocalSearchParams<{
    membershipId?: string;
    date?: string;
    mode?: string;
    jobId?: string;
  }>();
  const parsed = parseJobEditorParams(params);
  const invalid = parsed === null;
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  useEffect(() => {
    if (!invalid) return;
    toast.show(t('errors.NOT_FOUND'), 'danger');
    router.back();
  }, [invalid, router, toast, t]);
  if (!parsed) return null;
  return <JobEditorScreen {...parsed} />;
}
