import { useLocalSearchParams } from 'expo-router';
import { PersonScreen, personViewOf } from '@/features/person/PersonScreen';

// One person (CHQ-171): `view` picks day, week or month (month by default, CHQ-191), `month` the month it opens
// on, `date` the day.
export default function MemberRoute() {
  const { membershipId, month, view, date } = useLocalSearchParams<{
    membershipId: string;
    month?: string;
    view?: string;
    date?: string;
  }>();
  const initialMonth = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : undefined;
  const initialDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  return (
    <PersonScreen
      membershipId={membershipId}
      initialView={personViewOf(view) ?? 'month'}
      initialMonth={initialMonth}
      initialDate={initialDate}
    />
  );
}
