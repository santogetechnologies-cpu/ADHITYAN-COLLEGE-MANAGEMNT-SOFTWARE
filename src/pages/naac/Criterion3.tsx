import { CriterionTemplate } from './CriterionTemplate';
import { FlaskConical } from 'lucide-react';

export default function Criterion3() {
  return (
    <CriterionTemplate
      criterionNumber={3}
      title="Research, Innovations & Extension"
      description="Research Publications & Patents"
      icon={FlaskConical}
    />
  );
}