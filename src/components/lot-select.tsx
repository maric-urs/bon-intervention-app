import { Select } from "@/components/ui/input";

type LotOption = { code: string };

export function LotSelect({
  value,
  onChange,
  lots,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  lots: LotOption[];
  className?: string;
  disabled?: boolean;
}) {
  if (lots.length === 0) {
    return (
      <Select className={className} value="" onChange={() => {}} disabled>
        <option value="">— Aucun lot —</option>
      </Select>
    );
  }
  return (
    <Select className={className} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {lots.map((l) => (
        <option key={l.code} value={l.code}>
          {l.code}
        </option>
      ))}
    </Select>
  );
}
