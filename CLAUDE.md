# KSH Web

A Python/Flask port of [KSH (Kerbal Science History)](https://github.com/OrbitalManeuvers/KSH), a companion tool for Kerbal Space Program. The original is a Windows-only Delphi/VCL desktop app. This version runs on macOS (or anywhere) as a local web app.

## What it does

Reads a KSP save file (`persistent.sfs`) and displays a grid of science experiment completions, broken down by:
- **Celestial body** (Kerbin, Mun, Minmus, etc.)
- **Biome** (Shores, Grasslands, LaunchPad, etc. — or `(Global)` for experiments with no biome)
- **Situation** (Landed, Splashed, Fly Low, Fly High, Space Low, Space High)

No database, no network, no writes. Pure file-in → display-out.

## File structure

```
ksh-web/
  app.py                Flask app — one route, GET renders form, POST parses and renders results
  cfg_parser.py         Port of CFGNode + CFGReader + CFGWrapper (Delphi → Python)
  science_parser.py     Port of CFGScienceParser, extended with biome support
  templates/index.html  Single-page UI with collapsible body/biome sections
  static/style.css      Dark theme styling
  test/persistent.sfs   Test KSP save file (career mode, early game, Kerbin science)
```

## Running it

```bash
pip install flask
python app.py
# open http://localhost:5001
```

Enter the full path to a `persistent.sfs` file. Typical locations on macOS:
- Steam: `~/Library/Application Support/Steam/steamapps/common/Kerbal Space Program/saves/<SaveName>/persistent.sfs`

## KSP save file format

KSP uses a custom text format (`.sfs` / `.cfg`) that looks like:

```
NODE_TYPE
{
    key = value
    CHILD_NODE
    {
        key = value
    }
}
```

Science records live at `GAME > SCENARIO[name=ResearchAndDevelopment] > Science`.
Each `Science` node has an `id` field in the format:

```
experimentId@BodyNameSituationBiome
```

Examples:
- `crewReport@KerbinFlyingLowShores` → body=Kerbin, situation=FlyingLow, biome=Shores
- `mysteryGoo@KerbinFlyingLow` → body=Kerbin, situation=FlyingLow, biome=(none/global)

Nodes with `sci = 0` are skipped (partial collection, no science gained).

## Development notes

- The original Delphi source is in the parent directory (`../`) for reference
- `cfg_parser.py` closely mirrors the original parse logic; keep that parity
- `science_parser.py` extends the original by splitting out the biome from the remainder after the situation keyword
- The `(Global)` biome key is a display convention for biome-less experiments; it sorts first within a body

## Permissions for Claude

You have permission to freely run the following as part of normal development work without asking:
- `python` / `python3` scripts for testing and debugging
- `bash` commands including `grep`, `cat`, `ls`, `wc`, and similar read-only shell tools
- Flask dev server (`python app.py`) to verify the app runs
