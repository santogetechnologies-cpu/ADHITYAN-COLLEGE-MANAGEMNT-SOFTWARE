import { CriterionTemplate } from './CriterionTemplate';
import { BookOpen } from 'lucide-react';

export default function Criterion1() {
  return (
    <CriterionTemplate
      criterionNumber={1}
      title="Curricular Aspects"
      description="Curriculum Design & Development"
      icon={BookOpen}
    />
  );
}