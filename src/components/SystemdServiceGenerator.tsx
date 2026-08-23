"use client";

import { useState, useCallback, useMemo } from "react";
import { FiCopy, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";

interface Props { locale?: string; }

interface Service {
  id: number;
  description: string;
  execStart: string;
  workingDirectory: string;
  user: string;
  group: string;
  restart: string;
  restartSec: number;
  envs: string;
  wantedBy: string;
  after: string;
}

let nextId = 1;

const newService = (): Omit<Service, "id"> => ({
  description: "Mi aplicacion",
  execStart: "/usr/bin/node /opt/miapp/server.js",
  workingDirectory: "/opt/miapp",
  user: "app",
  group: "app",
  restart: "on-failure",
  restartSec: 5,
  envs: "NODE_ENV=production\nPORT=3000",
  wantedBy: "multi-user.target",
  after: "network.target",
});

const RESTARTS = ["no", "always", "on-failure", "on-abnormal"];

function buildUnit(s: Service): string {
  const lines = [`[Unit]`, `Description=${s.description}`, `After=${s.after}`];
  lines.push("", "[Service]");
  if (s.user) lines.push(`User=${s.user}`);
  if (s.group) lines.push(`Group=${s.group}`);
  if (s.workingDirectory) lines.push(`WorkingDirectory=${s.workingDirectory}`);
  lines.push(`ExecStart=${s.execStart}`);
  lines.push(`Restart=${s.restart}`);
  if (s.restart !== "no") lines.push(`RestartSec=${s.restartSec}s`);
  for (const env of s.envs.split("\n").map((l) => l.trim()).filter(Boolean)) {
    lines.push(`Environment="${env}"`);
  }
  lines.push("", "[Install]", `WantedBy=${s.wantedBy}`);
  return lines.join("\n");
}

export default function SystemdServiceGenerator({ locale = "es" }: Props) {
  const isEs = locale === "es";

  const [services, setServices] = useState<Service[]>([{ ...newService(), id: nextId++ }]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const update = useCallback((id: number, patch: Partial<Service>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const copy = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const units = useMemo(() => services.map(buildUnit), [services]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted/50">{isEs ? "Genera unidades systemd listas para /etc/systemd/system/." : "Generates systemd units ready for /etc/systemd/system/."}</p>
        <button onClick={() => setServices((prev) => [...prev, { ...newService(), id: nextId++ }])} className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-surface/60 px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text">
          <FiPlus className="text-xs" /> {isEs ? "Añadir servicio" : "Add service"}
        </button>
      </div>

      <div className="space-y-6">
        {services.map((s, idx) => (
          <div key={s.id} className="space-y-4 rounded-xl border border-border/20 bg-surface/20 p-4">
            <div className="flex items-center justify-between">
              <input value={s.description} onChange={(e) => update(s.id, { description: e.target.value })} placeholder={isEs ? "Descripción del servicio" : "Service description"} className="w-64 rounded-lg border border-border/30 bg-surface/60 px-3 py-2 text-sm font-medium text-text" />
              {services.length > 1 && (
                <button onClick={() => setServices((prev) => prev.filter((x) => x.id !== s.id))} aria-label="remove" className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"><FiTrash2 /></button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="ExecStart" mono value={s.execStart} onChange={(v) => update(s.id, { execStart: v })} />
              <Field label="WorkingDirectory" mono value={s.workingDirectory} onChange={(v) => update(s.id, { workingDirectory: v })} />
              <Field label="User" value={s.user} onChange={(v) => update(s.id, { user: v })} />
              <Field label="Group" value={s.group} onChange={(v) => update(s.id, { group: v })} />
            </div>

            <div>
              <label className="mb-1 block text-xs text-text-muted/70">{isEs ? "Variables de entorno" : "Environment variables"}</label>
              <textarea value={s.envs} onChange={(e) => update(s.id, { envs: e.target.value })} rows={2} placeholder="KEY=valor" className="w-full resize-none rounded-lg border border-border/30 bg-surface/60 px-3 py-2 font-mono text-xs text-text" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Select label="Restart" options={RESTARTS} value={s.restart} onChange={(v) => update(s.id, { restart: v })} />
              <NumField label="RestartSec (s)" value={s.restartSec} onChange={(v) => update(s.id, { restartSec: v })} min={1} max={300} disabled={s.restart === "no"} />
              <Field label="After" mono value={s.after} onChange={(v) => update(s.id, { after: v })} />
              <Field label="WantedBy" mono value={s.wantedBy} onChange={(v) => update(s.id, { wantedBy: v })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-sm font-medium text-text-muted">mi-servicio.service</label>
                <button onClick={() => copy(units[idx], idx)} className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                  {copiedIdx === idx ? <><FiCheck className="text-xs" /> {isEs ? "Copiado" : "Copied"}</> : <><FiCopy className="text-xs" /> {isEs ? "Copiar" : "Copy"}</>}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-border/30 bg-surface/40 px-4 py-3 font-mono text-xs leading-relaxed text-text">{units[idx]}</pre>
            </div>
          </div>
        ))}
      </div>

      <p className="rounded-xl border border-border/20 bg-surface/30 p-4 font-mono text-xs leading-relaxed text-text-muted">
        sudo nano /etc/systemd/system/mi-servicio.service<br />
        sudo systemctl daemon-reload<br />
        sudo systemctl enable --now mi-servicio.service
      </p>
    </div>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted/70">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border border-border/30 bg-surface/60 px-3 py-2 text-sm text-text ${mono ? "font-mono text-xs" : ""}`} />
    </div>
  );
}

function NumField({ label, value, onChange, min, max, disabled }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted/70">{label}</label>
      <input type="number" min={min} max={max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-border/30 bg-surface/60 px-3 py-2 text-sm text-text disabled:opacity-50" />
    </div>
  );
}

function Select({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted/70">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border/30 bg-surface/60 px-3 py-2 text-sm text-text">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
