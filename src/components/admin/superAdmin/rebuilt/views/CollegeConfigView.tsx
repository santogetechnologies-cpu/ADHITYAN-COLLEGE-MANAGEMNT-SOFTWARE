import { Link } from 'react-router-dom';
import { Building2, BookOpen, Layers, DollarSign, Settings, Plug, ArrowRight } from 'lucide-react';
import { College } from '@/types/institution.types';

const LINKS = [
  { to: '/admin/settings', icon: Settings, title: 'Institution profile & rules', text: 'Name, code, academic year, contact details, minimum attendance, pass mark, maintenance mode.' },
  { to: '/admin/departments', icon: Layers, title: 'Departments, courses & sections', text: 'The academic structure everything else hangs from.' },
  { to: '/finance', icon: DollarSign, title: 'Fees, plans & payment rules', text: 'Fee heads, class/department/student charges, instalments, discounts, online payments.' },
  { to: '/admission-management', icon: BookOpen, title: 'Admission forms & quotas', text: 'Application fields, entrance tests, merit lists and seats.' },
  { to: '/integrations', icon: Plug, title: 'Integrations', text: 'Payment gateway, e-mail, SMS and WhatsApp keys.' },
];

export function CollegeConfigView({ activeCollege }: { activeCollege: College }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center"><Building2 className="w-5 h-5 mr-2 text-indigo-600" />{activeCollege.name}</h2>
        <p className="text-xs text-slate-500">These settings live in the screens below, so there is one place to change each thing.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors flex items-start gap-3">
            <l.icon className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="flex-1"><div className="font-semibold text-sm text-slate-900">{l.title}</div><div className="text-xs text-slate-500">{l.text}</div></div>
            <ArrowRight className="w-4 h-4 text-slate-400 mt-1" />
          </Link>))}
      </div>
    </div>
  );
}
