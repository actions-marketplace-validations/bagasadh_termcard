import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  THEMES,
  resolveTheme,
  renderTyping,
  renderInfo,
  renderLink,
  renderStreak,
} from "../web/renderer.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const cases = [];

for (const themeName of Object.keys(THEMES)) {
  const cfg = { theme: themeName, width: 520, radius: 8 };
  cases.push({
    name: `${themeName}/typing`,
    config: cfg,
    card: { type: "typing", prompt_top: "┌ dev", prompt_bottom: "└›", words: ["Hi", "ship"], duration: 6 },
  });
  cases.push({
    name: `${themeName}/info`,
    config: cfg,
    card: {
      type: "info",
      sections: [
        [["Host", "Bagas"]],
        [{ label: "OS", value: "Linux" }, ["Shell", "zsh"]],
      ],
    },
  });
  cases.push({
    name: `${themeName}/link`,
    config: cfg,
    card: { type: "link", label: "GitHub", value: "@bagasadh" },
  });
  cases.push({
    name: `${themeName}/streak`,
    config: cfg,
    card: {
      type: "streak",
      title: "Streak",
      current_label: "Current streak",
      longest_label: "Longest streak",
      unit: "days",
      demo_days: {
        "2026-11-01": 1,
        "2026-11-02": 1,
        "2026-11-03": 1,
        "2026-11-04": 0,
        "2026-11-05": 1,
        "2026-11-06": 1,
      },
      preview_current: 2,
      preview_longest: 3,
      preview_current_range: "Nov 05 - Nov 06",
      preview_longest_range: "Nov 01 - Nov 03",
    },
  });
}

cases.push(
  {
    name: "edge/typing-escaping-and-clamp",
    config: { theme: "dashed-dark", width: 200, radius: 99, style: { stroke: '#fff"', text: "#eee<1>" } },
    card: { type: "typing", user: "octocat", words: "A&B, ok", duration: 0.5 },
  },
  {
    name: "edge/typing-empty-words",
    config: { theme: "solid-dark" },
    card: { type: "typing", words: [], prompt_top: "", prompt_bottom: "$" },
  },
  {
    name: "edge/info-rows-fallback",
    config: { theme: "dashed-light", width: 999 },
    card: { type: "info", rows: [["A & B", "1 < 2"]] },
  },
  {
    name: "edge/info-empty",
    config: { theme: "solid-light" },
    card: { type: "info" },
  },
  {
    name: "edge/link-empty-and-escaped",
    config: { theme: "terminal-green" },
    card: { type: "link", label: "", value: "a&b<c>" },
  },
  {
    name: "edge/streak-single-day",
    config: { theme: "solid-dark" },
    card: {
      type: "streak",
      demo_days: { "2026-11-10": 4 },
      preview_current: 1,
      preview_longest: 1,
      preview_current_range: "Nov 10",
      preview_longest_range: "Nov 10",
    },
  }
);

function renderJs(config, card) {
  const t = resolveTheme(config);
  switch (card.type) {
    case "typing":
      return renderTyping(card, t);
    case "info":
      return renderInfo(card, t);
    case "link":
      return renderLink(card, t);
    case "streak":
      return renderStreak(card, t);
    default:
      throw new Error(`Unsupported type: ${card.type}`);
  }
}

const pyScript = `
import json, sys, termcard
payload = json.loads(sys.argv[1])
out = []
for item in payload:
    t = termcard.resolve_theme(item["config"])
    c = item["card"]
    ct = c["type"]
    if ct == "typing":
        out.append(termcard.render_typing(c, t))
    elif ct == "info":
        out.append(termcard.render_info(c, t))
    elif ct == "link":
        out.append(termcard.render_link(c, t))
    elif ct == "streak":
        out.append(termcard.render_streak(c, t, token=""))
print(json.dumps(out))
`;

const pyOutput = execFileSync("python3", ["-c", pyScript, JSON.stringify(cases)], {
  cwd: repoRoot,
  encoding: "utf8",
});
const pySvgs = JSON.parse(pyOutput);

assert.equal(pySvgs.length, cases.length);
cases.forEach((item, idx) => {
  const jsSvg = renderJs(item.config, item.card);
  assert.equal(jsSvg, pySvgs[idx], `Parity mismatch for case: ${item.name}`);
});

console.log(`Parity OK: ${cases.length} cases matched byte-for-byte between termcard.py and web/renderer.js.`);

