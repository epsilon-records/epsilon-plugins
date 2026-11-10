"""Rewrites the Benchmarks section of the top-level README from benchmarks/results/*.json."""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
README = os.path.join(HERE, "..", "README.md")
START, END = "<!-- benchmarks:start -->", "<!-- benchmarks:end -->"


def f(x, nd=1, sign=False):
    if isinstance(x, str) or x != x:
        return "—"
    if x == float("-inf"):
        return "bit-exact"
    x = 0.0 if round(x, nd) == 0 else x
    s = f"{x:+.{nd}f}" if sign else f"{x:.{nd}f}"
    return s.replace("-", "−")


def ms(samples, sr=48000):
    return "0" if samples == 0 else f"{samples} smp ({samples / sr * 1000:.1f} ms)"


def alias(a):
    return f"aliasing at A6 {f(a['total_db'])} dB ({f(a['below_10khz_db'])} dB below 10 kHz)"


def filt(r):
    lp = r["lowpass_1khz"]
    pb = lp["passband_db"]
    return (f"1 kHz low-pass, minimum resonance: −3 dB at {f(lp['measured_3db_hz'], 0)} Hz"
            + (f" (passband {f(pb, 1)} dB)" if abs(pb) >= 0.25 else "")
            + f", {f(-lp['slope_db_per_oct'], 1)} dB/oct roll-off; THD+N {f(r['thd_n_200hz_-12dbfs_db'])} dB (200 Hz, −12 dBFS)")


def key(name, r):
    if name == "Monolith":
        return f"10 voices {f(r['cpu_10_voices_pct'], 1)}% CPU; {alias(r['aliasing_A6'])}"
    if name == "Obsidian":
        return f"8 voices {f(r['cpu_8_voices_pct'], 1)}% CPU; {alias(r['aliasing_A6'])}"
    if name == "Malachite":
        return alias(r["aliasing_A6"])
    if name in ("Caldera", "Basalt", "Flint"):
        return filt(r)
    if name == "Gneiss":
        return (f"4:1 above −30 dB measures {f(r['measured_ratio'], 2)}:1; "
                f"{f(r['gain_error_below_threshold_db'], 2)} dB gain change below threshold")
    if name == "Mica":
        b, c = r["bell_1khz_+6db"], r["low_cut_100hz_48db"]
        return (f"flat: {f(r['null_default_db'])}; +6 dB bell at 1 kHz measures {f(b['peak_db'], 2, True)} dB at "
                f"{f(b['peak_hz'], 0)} Hz; 48 dB/oct cut measures {f(c['slope_db_per_oct'], 1)} dB/oct; "
                f"24 bands {f(r['cpu_24_bands_pct'], 1)}% CPU; linear phase {ms(r['latency_linear_phase_samples'])}"
                + (f", natural phase {ms(r['latency_natural_phase_samples'])}" if 'latency_natural_phase_samples' in r else ""))
    if name == "Granite":
        o = {k.split("_", 1)[1]: v for k, v in r.items() if k.startswith("oversampling_")}
        tp = ", ".join(f"{k} {f(v['true_peak_dbfs'], 2, True)}" for k, v in o.items())
        sp = max(v["sample_peak_dbfs"] for v in o.values())
        return (f"+12 dB into a {f(float(r['ceiling']), 1)} dB ceiling: sample peak {f(sp, 2)} dBFS; "
                f"true peak by oversampling: {tp} dBTP")
    if name == "Slate":
        return (f"−40 dB threshold, 40 dB range: {f(r['gain_open_-20dbfs_db'], 1, True)} dB at −20 dBFS, "
                f"{f(r['gain_closed_-60dbfs_db'], 1)} dB at −60 dBFS")
    if name == "Talc":
        return (f"default (8 dB range): 500 Hz tone {f(r['gain_500hz_-12dbfs_db'], 1, True)} dB, "
                f"7 kHz tone {f(r['gain_7khz_-12dbfs_db'], 1)} dB")
    if name == "Schist":
        return (f"flat: {f(r['null_default_db'])}; 6 bands {f(r['cpu_6_bands_pct'], 1)}% CPU; "
                f"linear phase {ms(r['latency_linear_phase_samples'])}")
    if name == "Magma":
        d = r["default_2_5khz_-6dbfs"]
        return (f"default (Warm Tube, drive 0.3), 2.5 kHz at −6 dBFS: THD+N {f(d['thd_n_db'])} dB, "
                f"non-harmonic {f(d['inharmonic_db'])} dB")
    if name == "Geode":
        rt = [(k.split("_")[2], v) for k, v in r.items() if k.startswith("rt60_")]
        return "RT60 at Space " + ", ".join(f"{float(s) * 100:.0f}% {f(v, 2)} s" for s, v in rt)
    if name == "Strata":
        errs = [abs(side["error_ms"]) for k, v in r.items() if k.startswith("echo_") for side in v.values()]
        return f"echoes land within {max(errs):.3f} ms of the displayed delay time (Tape and Stretch)"
    return ""


def latency_of(r):
    if "latency_samples" in r:
        return ms(r["latency_samples"])
    if "dry_latency_samples" in r:
        return ms(r["dry_latency_samples"])
    return "—"


def main():
    order = [p["name"] for p in json.load(open(os.path.join(HERE, "..", "plugins.json")))["plugins"]]
    rows, machine = [], None
    for name in order:
        d = json.load(open(os.path.join(HERE, "results", f"{name}.json")))
        machine = d.get("machine")
        if "error" in d:
            rows.append(f"| {name} | {d['version']} | — | — | not measured (suite error) |")
            continue
        r = d["results"]
        cpu = r.get("cpu_default_pct", r.get("cpu_1_voice_pct"))
        rows.append(f"| {name} | {d['version']} | {f(cpu, 1)}% | {latency_of(r)} | {key(name, r)} |")
    # merged but not yet released: measured from the plugin repo's main branch, listed under the table
    notes = []
    for name in order:
        path = os.path.join(HERE, "results", "unreleased", f"{name}.json")
        if not os.path.exists(path):
            continue
        d = json.load(open(path))
        if "error" in d:
            continue
        r = d["results"]
        cpu = r.get("cpu_default_pct", r.get("cpu_1_voice_pct"))
        notes.append(f"- **{name}** (`main` at [`{d['commit']}`](https://github.com/epsilon-records/{name.lower()}/commit/{d['commit']}), "
                     f"not yet in a release): {key(name, r)}; CPU {f(cpu, 1)}%, latency {latency_of(r)}.")
    # releases newer than the measured tag (plugins.json is the released version): say so under the table
    released = {p["name"]: p["version"] for p in json.load(open(os.path.join(HERE, "..", "plugins.json")))["plugins"]}
    def norm(v):
        parts = v.lstrip("v").split(".")
        while len(parts) < 3:
            parts.append("0")
        return tuple(int(x) for x in parts[:3])
    stale = []
    for name in order:
        d = json.load(open(os.path.join(HERE, "results", f"{name}.json")))
        if d["version"].startswith("v") and norm(d["version"]) < norm(released[name]):
            stale.append(f"{name} {released[name].removesuffix('.0') if released[name].count('.') == 2 and released[name].endswith('.0') else released[name]}")
    if stale:
        notes_stale = ["Not yet re-measured since their latest release (the rows above are the previous release): "
                       + ", ".join(stale) + ".", ""]
    else:
        notes_stale = []
    section = "\n".join([
        START,
        "## Benchmarks",
        "",
        "Measured from each plugin's Linux x64 VST3 at its release tag, rendered offline at 48 kHz in 512-sample "
        "blocks. CPU is the share of one core, including host overhead, on a 2-vCPU cloud Linux machine; "
        "instruments are measured holding one note. Latency is what the plugin reports to the host. "
        "Method, scripts and the full per-plugin results are in [`benchmarks/`](benchmarks).",
        "",
        "| Plugin | Version | CPU | Latency | Key measurements |",
        "|---|---|---|---|---|",
        *rows,
        "",
        *((["Merged changes awaiting a release, measured the same way:", "", *notes, ""]) if notes else []),
        *notes_stale,
        END,
    ])
    text = open(README).read()
    if START in text:
        text = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda _: section, text, flags=re.S)
    else:
        text = text.replace("## Lineage and clean-room note", section + "\n\n## Lineage and clean-room note")
    open(README, "w").write(text)
    print(section)


if __name__ == "__main__":
    main()
