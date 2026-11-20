import datetime as dt
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import termcard


class TestTermcard(unittest.TestCase):
    def assertValidSvg(self, svg: str) -> ET.Element:
        root = ET.fromstring(svg)
        self.assertTrue(root.tag.endswith("svg"))
        return root

    def test_all_themes_and_style_override(self) -> None:
        for name in termcard.THEMES:
            t = termcard.resolve_theme({"theme": name, "width": 500, "style": {"stroke": "#ff0000"}})
            self.assertEqual(t["width"], 500)
            self.assertEqual(t["stroke"], "#ff0000")

    def test_render_typing_valid_xml_and_escaping(self) -> None:
        t = termcard.resolve_theme({"theme": "dashed-dark"})
        svg = termcard.render_typing(
            {"prompt_top": "┌ dev & ops", "prompt_bottom": "└>", "words": ["A<B", "ok"], "duration": 6},
            t,
        )
        self.assertValidSvg(svg)
        self.assertIn("dev &amp; ops", svg)
        self.assertIn("&lt;", svg)
        self.assertIn("@keyframes l0", svg)
        self.assertIn("@keyframes c0", svg)

    def test_render_info_sections_and_dividers(self) -> None:
        t = termcard.resolve_theme({"theme": "solid-dark"})
        svg = termcard.render_info(
            {
                "sections": [
                    [["Host", "Alice"]],
                    [{"label": "OS", "value": "Arch & i3"}],
                ]
            },
            t,
        )
        self.assertValidSvg(svg)
        self.assertIn("<line ", svg)
        self.assertIn("Arch &amp; i3", svg)

    def test_render_link_valid_xml(self) -> None:
        t = termcard.resolve_theme({"theme": "terminal-green"})
        svg = termcard.render_link({"label": "Email", "value": "me@example.com"}, t)
        self.assertValidSvg(svg)
        self.assertIn("me@example.com", svg)
        self.assertIn('text-decoration="underline"', svg)

    def test_compute_streaks_edge_cases(self) -> None:
        days = {
            "2026-11-01": 3,
            "2026-11-02": 4,
            "2026-11-03": 2,
            "2026-11-04": 0,
            "2026-11-05": 1,
            "2026-11-06": 5,
            "2026-11-07": 0,
        }
        cur, best = termcard.compute_streaks(days, dt.date(2026, 11, 7))
        self.assertEqual(cur[0], 2)
        self.assertEqual(cur[1], dt.date(2026, 11, 5))
        self.assertEqual(cur[2], dt.date(2026, 11, 6))
        self.assertEqual(best[0], 3)

        broken_cur, _ = termcard.compute_streaks(days, dt.date(2026, 11, 8))
        self.assertEqual(broken_cur[0], 0)

    def test_render_streak_and_build_cards_with_readme(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cfg_path = root / "termcard.json"
            readme_path = root / "README.md"
            out_dir = root / "assets"

            cfg_path.write_text(
                json.dumps(
                    {
                        "theme": "dashed-light",
                        "cards": [
                            {"type": "typing", "output": "t.svg", "words": ["hi"]},
                            {
                                "type": "streak",
                                "output": "s.svg",
                                "demo_days": {"2026-11-10": 2, "2026-11-11": 5},
                            },
                            {"type": "link", "output": "l.svg", "label": "Web", "value": "example.com", "url": "https://example.com"},
                        ],
                    }
                ),
                encoding="utf-8",
            )
            readme_path.write_text("# Hi\n<!-- TERMCARD:START -->\nold\n<!-- TERMCARD:END -->\n", encoding="utf-8")

            written = termcard.build_cards(cfg_path, out_dir, readme_path=readme_path)
            self.assertEqual(len(written), 3)
            for svg_file in written:
                self.assertValidSvg(svg_file.read_text(encoding="utf-8"))

            readme_text = readme_path.read_text(encoding="utf-8")
            self.assertIn('<img src="assets/t.svg" width="560"', readme_text)
            self.assertIn('<a href="https://example.com"><img src="assets/l.svg"', readme_text)
            self.assertNotIn("old", readme_text)

    def test_resolve_streak_user_fallback(self) -> None:
        import os
        old = os.environ.get("GITHUB_REPOSITORY_OWNER")
        try:
            os.environ["GITHUB_REPOSITORY_OWNER"] = "octocat"
            self.assertEqual(termcard.resolve_streak_user({"user": "your-username"}), "octocat")
            self.assertEqual(termcard.resolve_streak_user({}), "octocat")
            self.assertEqual(termcard.resolve_streak_user({"user": "bagasadh"}), "bagasadh")
        finally:
            if old is None:
                os.environ.pop("GITHUB_REPOSITORY_OWNER", None)
            else:
                os.environ["GITHUB_REPOSITORY_OWNER"] = old

    def test_render_typing_reduced_motion_shows_first_word(self) -> None:
        t = termcard.resolve_theme({"theme": "dashed-dark"})
        svg = termcard.render_typing({"words": ["Hi", "fastfetch"], "duration": 1}, t)
        root = self.assertValidSvg(svg)
        self.assertIn("@media (prefers-reduced-motion: reduce){text,rect{animation:none !important}.r{opacity:1 !important}}", svg)
        self.assertIn("2s step-end infinite", svg)
        r_texts = [el.text for el in root.iter() if el.tag.endswith("text") and el.attrib.get("class") == "r"]
        self.assertEqual(sorted(r_texts), ["H", "i"])
        r_rects = [el for el in root.iter() if el.tag.endswith("rect") and el.attrib.get("class") == "r"]
        self.assertEqual(len(r_rects), 1)

    def test_resolve_theme_clamping_and_style_escaping(self) -> None:
        t = termcard.resolve_theme(
            {
                "theme": "dashed-dark",
                "width": 100,
                "radius": 99,
                "style": {
                    "bg": '#111" onclick="x',
                    "stroke": "#fff<bad>",
                    "text": "#eee",
                    "link": '#09f"',
                },
            }
        )
        self.assertEqual(t["width"], 360)
        self.assertEqual(t["radius"], 20)
        svg = termcard.render_link({"label": "Site", "value": "example.com"}, t)
        self.assertValidSvg(svg)
        self.assertIn("&quot;", svg)
        self.assertIn("&lt;bad&gt;", svg)

    def test_update_readme_handles_backslashes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            readme_path = Path(tmp) / "README.md"
            readme_path.write_text("<!-- TERMCARD:START -->\n<!-- TERMCARD:END -->\n", encoding="utf-8")
            ok = termcard.update_readme(readme_path, [("assets/t.svg", "https://example.com", r"dev\1\ops", 560)])
            self.assertTrue(ok)
            content = readme_path.read_text(encoding="utf-8")
            self.assertIn(r'alt="dev\1\ops"', content)

    def test_render_streak_integer_divider_coords(self) -> None:
        t = termcard.resolve_theme({"theme": "dashed-dark", "width": 560})
        svg = termcard.render_streak(
            {"demo_days": {"2026-11-08": 1, "2026-11-09": 2}},
            t,
            token="",
        )
        self.assertValidSvg(svg)
        self.assertIn('x1="280"', svg)
        self.assertNotIn('x1="280.0"', svg)

    def test_examples_preview_matches_generator(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        cfg_path = repo_root / "examples" / "termcard.json"
        preview_dir = repo_root / "examples" / "preview"
        with tempfile.TemporaryDirectory() as tmp:
            out_dir = Path(tmp)
            termcard.build_cards(cfg_path, out_dir, skip_streak=True)
            for name in ("typing.svg", "info.svg", "contact-email.svg"):
                self.assertEqual(
                    (preview_dir / name).read_text(encoding="utf-8"),
                    (out_dir / name).read_text(encoding="utf-8"),
                )


if __name__ == "__main__":
    unittest.main()

