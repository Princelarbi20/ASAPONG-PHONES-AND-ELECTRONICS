import { getPasswordStrength } from '../../../shared/passwordPolicy.js';

const levels = ['Weak', 'Fair', 'Good', 'Strong'];
const colorByLevel = {
  Weak: 'bg-red-500',
  Fair: 'bg-amber-500',
  Good: 'bg-lime-600',
  Strong: 'bg-emerald-600',
};

export default function PasswordStrengthIndicator({ password }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);
  const filledBars = levels.indexOf(strength) + 1;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {levels.map((level, index) => (
          <span key={level} className={`h-1.5 flex-1 rounded-full ${index < filledBars ? colorByLevel[strength] : 'bg-slate-200'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-600">Password strength: <span className="font-semibold">{strength}</span></p>
    </div>
  );
}
