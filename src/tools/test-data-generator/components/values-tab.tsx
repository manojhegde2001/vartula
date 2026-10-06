"use client";

import { useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  aadhaar,
  cardBrands,
  cardNumber,
  createRng,
  formatCard,
  formatIban,
  gstin,
  iban,
  ibanCountries,
  ifsc,
  indianMobile,
  nanoid,
  newSeed,
  pan,
  password,
  randInt,
  timestampFormats,
  ulid,
  upiId,
  uuidV4,
  uuidV7,
  vehicleIN,
  type CardBrand,
  type IbanCountry,
  type PasswordRules,
  type Rng,
} from "../engine";
import { Card, CopyButton, Field, NumberInput, selectClassName } from "./parts";

/** A card that lists `count` generated values with copy buttons and a regenerate button. */
function ValueCard({ title, controls, make, count = 5, mono = true }: { title: string; controls?: ReactNode; make: (rng: Rng) => string; count?: number; mono?: boolean }) {
  const [seed, setSeed] = useState(1);
  const rng = createRng(seed * 7919 + title.length);
  const values = Array.from({ length: count }, () => make(rng));
  return (
    <Card
      title={title}
      aside={
        <div className="flex">
          <CopyButton text={values.join("\n")} label={`Copy all ${title}`} />
          <Button variant="ghost" size="icon-sm" aria-label={`New ${title}`} title="Generate new values" onClick={() => setSeed(newSeed())}>
            <RefreshCw />
          </Button>
        </div>
      }
    >
      {controls && <div className="mb-3 grid gap-2 sm:grid-cols-2">{controls}</div>}
      <ul className="divide-y rounded-lg border" data-testid={`values-${title}`}>
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-2 px-3 py-1">
            <span className={mono ? "min-w-0 flex-1 truncate font-mono text-sm" : "min-w-0 flex-1 truncate text-sm"}>{v}</span>
            <CopyButton text={v.replace(/\s/g, mono ? "" : " ")} label={`Copy ${v}`} size="icon-xs" />
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Public sandbox numbers from payment providers' documentation; they only work in test mode.
const sandboxCards = [
  { number: "4242 4242 4242 4242", note: "Visa · succeeds (Stripe)" },
  { number: "4000 0000 0000 0002", note: "Visa · declined (Stripe)" },
  { number: "4000 0000 0000 9995", note: "Visa · insufficient funds (Stripe)" },
  { number: "4000 0027 6000 3184", note: "Visa · requires 3-D Secure (Stripe)" },
  { number: "5555 5555 5555 4444", note: "Mastercard · succeeds (Stripe)" },
  { number: "3782 822463 10005", note: "American Express · succeeds (Stripe)" },
];

const indiaKinds = {
  pan: { label: "PAN", make: (r: Rng) => pan(r) },
  gstin: { label: "GSTIN", make: (r: Rng) => gstin(r) },
  aadhaar: { label: "Aadhaar-format number", make: (r: Rng) => aadhaar(r).replace(/(\d{4})(?=\d)/g, "$1 ") },
  ifsc: { label: "IFSC", make: (r: Rng) => ifsc(r) },
  mobile: { label: "Mobile (+91)", make: (r: Rng) => indianMobile(r) },
  upi: { label: "UPI ID", make: (r: Rng) => upiId(r, ["asha", "rahul", "priya", "vikram", "neha"][randInt(r, 0, 4)]) },
  vehicle: { label: "Vehicle registration", make: (r: Rng) => vehicleIN(r) },
};
type IndiaKind = keyof typeof indiaKinds;

const idKinds = {
  v4: { label: "UUID v4", make: (r: Rng) => uuidV4(r) },
  v7: { label: "UUID v7", make: (r: Rng) => uuidV7(r) },
  ulid: { label: "ULID", make: (r: Rng) => ulid(r) },
  nano: { label: "Nano ID", make: (r: Rng) => nanoid(r) },
};
type IdKind = keyof typeof idKinds;

function Timestamps() {
  const [value, setValue] = useState(() => new Date().toISOString().slice(0, 19));
  const d = new Date(`${value}Z`);
  const valid = !Number.isNaN(d.getTime());
  return (
    <Card
      title="Timestamps"
      aside={
        <Button variant="ghost" size="sm" onClick={() => setValue(new Date().toISOString().slice(0, 19))}>
          Now
        </Button>
      }
    >
      <Field label="Date and time (UTC)" htmlFor="tdg-ts">
        <input id="tdg-ts" type="datetime-local" step={1} className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      {valid && (
        <ul className="mt-3 divide-y rounded-lg border">
          {timestampFormats(d).map((f) => (
            <li key={f.label} className="flex items-center gap-2 px-3 py-1">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">{f.label}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-sm">{f.value}</span>
              <CopyButton text={f.value} label={`Copy ${f.label}`} size="icon-xs" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ValuesTab() {
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [country, setCountry] = useState<IbanCountry>("DE");
  const [india, setIndia] = useState<IndiaKind>("pan");
  const [idKind, setIdKind] = useState<IdKind>("v4");
  const [rules, setRules] = useState<PasswordRules>({ length: 16, upper: true, lower: true, digits: true, symbols: true, noAmbiguous: true });
  const [range, setRange] = useState({ min: 1, max: 100 });

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <ValueCard
        title="Card numbers"
        make={(r) => formatCard(cardNumber(r, brand))}
        controls={
          <select aria-label="Card brand" className={selectClassName} value={brand} onChange={(e) => setBrand(e.target.value as CardBrand)}>
            {(Object.keys(cardBrands) as CardBrand[]).map((b) => (
              <option key={b} value={b}>
                {cardBrands[b].label}
              </option>
            ))}
          </select>
        }
      />
      <Card title="Sandbox test cards">
        <ul className="divide-y rounded-lg border">
          {sandboxCards.map((c) => (
            <li key={c.number} className="flex items-center gap-2 px-3 py-1">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-sm">{c.number}</span>
                <span className="block text-xs text-muted-foreground">{c.note}</span>
              </span>
              <CopyButton text={c.number.replace(/\s/g, "")} label={`Copy ${c.number}`} size="icon-xs" />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Use any future expiry date and any CVC. Generated numbers pass the Luhn check but are rejected by real payment networks.</p>
      </Card>
      <ValueCard
        title="IBANs"
        make={(r) => formatIban(iban(r, country))}
        controls={
          <select aria-label="IBAN country" className={selectClassName} value={country} onChange={(e) => setCountry(e.target.value as IbanCountry)}>
            {(Object.keys(ibanCountries) as IbanCountry[]).map((c) => (
              <option key={c} value={c}>
                {ibanCountries[c].label}
              </option>
            ))}
          </select>
        }
      />
      <ValueCard
        title="Indian IDs"
        make={indiaKinds[india].make}
        controls={
          <select aria-label="Indian ID type" className={selectClassName} value={india} onChange={(e) => setIndia(e.target.value as IndiaKind)}>
            {(Object.keys(indiaKinds) as IndiaKind[]).map((k) => (
              <option key={k} value={k}>
                {indiaKinds[k].label}
              </option>
            ))}
          </select>
        }
      />
      <ValueCard
        title="Unique IDs"
        make={idKinds[idKind].make}
        controls={
          <select aria-label="ID type" className={selectClassName} value={idKind} onChange={(e) => setIdKind(e.target.value as IdKind)}>
            {(Object.keys(idKinds) as IdKind[]).map((k) => (
              <option key={k} value={k}>
                {idKinds[k].label}
              </option>
            ))}
          </select>
        }
      />
      <ValueCard
        title="Passwords"
        make={(r) => password(r, rules)}
        controls={
          <>
            <Field label="Length" htmlFor="tdg-pw-len">
              <NumberInput id="tdg-pw-len" value={rules.length} onCommit={(length) => setRules({ ...rules, length })} min={4} max={128} />
            </Field>
            <div className="grid grid-cols-2 gap-x-2 text-sm">
              {(
                [
                  ["upper", "A–Z"],
                  ["lower", "a–z"],
                  ["digits", "0–9"],
                  ["symbols", "!@#"],
                  ["noAmbiguous", "No 0/O/l/1"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={rules[k]} onChange={(e) => setRules({ ...rules, [k]: e.target.checked })} className="accent-(--tone)" />
                  {label}
                </label>
              ))}
            </div>
          </>
        }
      />
      <ValueCard
        title="Random numbers"
        make={(r) => String(randInt(r, Math.min(range.min, range.max), Math.max(range.min, range.max)))}
        controls={
          <>
            <Field label="Min" htmlFor="tdg-min">
              <NumberInput id="tdg-min" value={range.min} onCommit={(min) => setRange({ ...range, min })} />
            </Field>
            <Field label="Max" htmlFor="tdg-max">
              <NumberInput id="tdg-max" value={range.max} onCommit={(max) => setRange({ ...range, max })} />
            </Field>
          </>
        }
      />
      <Timestamps />
    </div>
  );
}
