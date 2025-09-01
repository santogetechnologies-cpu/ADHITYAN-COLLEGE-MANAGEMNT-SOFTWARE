import { CriterionTemplate } from './CriterionTemplate';
import { GraduationCap } from 'lucide-react';

export default function Criterion2() {
  return (
    <CriterionTemplate
      criterionNumber={2}
      title="Teaching-Learning & Evaluation"
      description="Student Enrollment & Profile"
      icon={GraduationCap}
    />
  );
}