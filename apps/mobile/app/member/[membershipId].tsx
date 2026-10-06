import { useLocalSearchParams } from 'expo-router';
import { PersonScreen, personViewOf } from '@/features/person/PersonScreen';

// One person (CHQ-171): `view` picks day, week or month (week by default, month when a `month` is given),
// `date` the day it opens on.
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
      initialView={personViewOf(view) ?? (initialMonth ? 'month' : 'week')}
      initialMonth={initialMonth}
      initialDate={initialDate}
    />
  );
}
