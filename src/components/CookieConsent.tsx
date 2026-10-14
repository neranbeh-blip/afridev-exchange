import { Cookie, Settings2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Preferences = {
  essential: true;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "afridev-cookie-consent-v1";
const defaultPreferences: Preferences = {
  essential: true,
  analytics: false,
  personalization: false,
  marketing: false,
  updatedAt: "",
};

function readPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      essential: true,
      analytics: parsed.analytics === true,
      personalization: parsed.personalization === true,
      marketing: parsed.marketing === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function savePreferences(value: Omit<Preferences, "updatedAt">) {
  const saved: Preferences = { ...value, essential: true, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    window.dispatchEvent(new CustomEvent("afridev-cookie-consent-changed", { detail: saved }));
  } catch {
    // Consent controls still work for this visit if storage is unavailable.
  }
  return saved;
}

export default function CookieConsent() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState(defaultPreferences);

  useEffect(() => {
    const stored = readPreferences();
    if (stored) setPreferences(stored);
    const openSettings = () => {
      setDraft(readPreferences() ?? defaultPreferences);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener("afridev-open-cookie-settings", openSettings);
    return () => window.removeEventListener("afridev-open-cookie-settings", openSettings);
  }, []);

  function acceptAll() {
    const saved = savePreferences({ essential: true, analytics: true, personalization: true, marketing: true });
    setPreferences(saved);
    setOpen(false);
    setCustomizing(false);
  }

  function rejectOptional() {
    const saved = savePreferences({ ...defaultPreferences });
    setPreferences(saved);
    setOpen(false);
    setCustomizing(false);
  }

  function saveCustom() {
    const saved = savePreferences({ ...draft, essential: true });
    setPreferences(saved);
    setOpen(false);
    setCustomizing(false);
  }

  return (
    <>
      {!preferences && !open && (
        <div role="dialog" aria-label="Cookie preferences" aria-live="polite" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-5xl rounded-2xl border border-white/15 bg-slate-950/95 p-5 text-white shadow-2xl shadow-black/50 backdrop-blur-xl sm:inset-x-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><Cookie size={20} /></div>
              <div className="max-w-2xl">
                <h2 className="font-bold">Your privacy matters</h2>
                <p className="mt-1 text-sm leading-6 text-slate-300">AfriDev uses essential browser storage to run the site and remember your choices. Optional categories are off unless you choose otherwise. Review the <Link to="/cookies" className="font-semibold text-blue-300 underline underline-offset-4">Cookie Policy</Link> and <Link to="/privacy" className="font-semibold text-blue-300 underline underline-offset-4">Privacy Policy</Link>.</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">This control saves your preferences; optional analytics or advertising tools must be separately connected to these choices before being enabled.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:max-w-[390px] md:justify-end">
              <button onClick={rejectOptional} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Reject optional</button>
              <button onClick={() => { setDraft(readPreferences() ?? defaultPreferences); setCustomizing(true); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"><Settings2 size={15} /> Customize</button>
              <button onClick={acceptAll} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500">Accept all</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><ShieldCheck size={22} /></div><h2 id="cookie-settings-title" className="text-2xl font-black">Cookie preferences</h2><p className="mt-2 text-sm leading-6 text-slate-400">Choose whether to allow optional categories. Essential storage is always active so core site functions and your privacy choices can work.</p></div>
              <button aria-label="Close preferences" onClick={() => { setOpen(false); setCustomizing(false); }} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={19} /></button>
            </div>
            <div className="mt-6 space-y-3">
              <PreferenceRow title="Essential" description="Sign-in, security, core app operation and remembering this choice." checked locked onChange={() => undefined} />
              {customizing && <>
                <PreferenceRow title="Analytics" description="Helps understand usage and improve the service, if analytics are installed." checked={draft.analytics} onChange={(checked) => setDraft(v => ({ ...v, analytics: checked }))} />
                <PreferenceRow title="Personalization" description="Remembers optional preferences beyond what is necessary to run the site." checked={draft.personalization} onChange={(checked) => setDraft(v => ({ ...v, personalization: checked }))} />
                <PreferenceRow title="Marketing" description="Supports advertising or marketing technologies, if they are ever enabled." checked={draft.marketing} onChange={(checked) => setDraft(v => ({ ...v, marketing: checked }))} />
              </>}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={rejectOptional} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Reject optional</button>
              {!customizing && <button onClick={() => setCustomizing(true)} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">Customize</button>}
              <button onClick={customizing ? saveCustom : acceptAll} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold hover:bg-blue-500">{customizing ? "Save my choices" : "Accept all"}</button>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">You can change your choice later from the Cookie settings link in the site's footer. See our <Link to="/cookies" onClick={() => setOpen(false)} className="text-blue-300 underline underline-offset-4">Cookie Policy</Link>.</p>
          </section>
        </div>
      )}
    </>
  );
}

function PreferenceRow({ title, description, checked, locked = false, onChange }: { title: string; description: string; checked: boolean; locked?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div><h3 className="text-sm font-bold">{title}{locked && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">Always on</span>}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div>
      <button type="button" role="switch" aria-checked={checked} aria-label={`${title} cookies`} disabled={locked} onClick={() => onChange(!checked)} className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed ${checked ? "bg-blue-600" : "bg-slate-700"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button>
    </div>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("afridev-open-cookie-settings"));
}
