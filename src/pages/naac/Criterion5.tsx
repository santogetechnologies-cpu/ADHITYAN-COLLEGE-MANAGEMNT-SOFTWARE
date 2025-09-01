import { CriterionTemplate } from './CriterionTemplate';
import { Users } from 'lucide-react';

export default function Criterion5() {
  return (
    <CriterionTemplate
      criterionNumber={5}
      title="Student Support & Progression"
      description="Student Support & Guidance"
      icon={Users}
    />
  );
}