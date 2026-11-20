# termcard

Generate terminal-styled SVG profile cards (typing banner, info box, GitHub streak, and links) from a single JSON config via GitHub Actions.

<p align="center">
  <img src="examples/preview/typing.svg" width="520" alt="Typing card preview"><br>
  <img src="examples/preview/info.svg" width="520" alt="Info card preview"><br>
  <img src="examples/preview/streak.svg" width="520" alt="Streak card preview"><br>
  <img src="examples/preview/contact-email.svg" width="520" alt="Link card preview">
</p>

## Features
- Four card types: `typing`, `info`, `streak`, and `link`.
- Five built-in themes (`dashed-dark`, `dashed-light`, `solid-dark`, `solid-light`, `terminal-green`) with color, border, and width overrides.
- Zero external dependencies (Python 3 standard library only) and optional README injection between `<!-- TERMCARD:START -->` and `<!-- TERMCARD:END -->`.

## Usage

Copy [`examples/termcard.json`](examples/termcard.json) into your profile repo as `termcard.json`, then add `.github/workflows/termcard.yml`:

```yaml
- uses: actions/checkout@v4
- uses: bagasadh/termcard@v1
  with:
    config: termcard.json
    output_dir: assets
    readme: README.md
    token: ${{ secrets.GITHUB_TOKEN }}
```

Run locally: `python3 termcard.py --config examples/termcard.json --out assets --skip-streak`
