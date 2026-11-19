import { Pill } from '../../components/ui';
import type { QuestionStatus } from '../api';

const TONE: Record<QuestionStatus, 'neutral' | 'lime' | 'purple' | 'orange'> = {
  submitted: 'purple', in_review: 'purple', changes_requested: 'orange', rejected: 'neutral', published: 'lime', archived: 'neutral',
};

export function StatusPill({ status, label }: { status: QuestionStatus; label: string }) {
  return <Pill tone={TONE[status]}>{label.toUpperCase()}</Pill>;
}
