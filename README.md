# KSH Web

A macOS-compatible web app port of [KSH (Kerbal Science History)](https://github.com/OrbitalManeuvers/KSH) by OrbitalManeuvers.

KSH is a companion tool for [Kerbal Space Program](https://www.kerbalspaceprogram.com/) that reads your save file and shows which science experiments you've completed, broken down by celestial body, biome, and situation.

The original is a Windows-only Delphi desktop app. This version runs as a local Flask web app on macOS (or any platform with Python).

## Features

- Parses KSP `persistent.sfs` save files directly from disk
- Displays science completions grouped by celestial body → biome → experiment
- Six situation columns: Landed, Splashed, Fly Low, Fly High, Space Low, Space High
- Collapsible body and biome sections
- Filter to focus on a single celestial body

## Requirements

- Python 3.8+
- Flask

## Usage

```bash
pip install flask
python app.py
```

Open [http://localhost:5001](http://localhost:5001) in your browser and enter the path to your `persistent.sfs` save file.

**Typical save file locations on macOS:**

- Steam: `~/Library/Application Support/Steam/steamapps/common/Kerbal Space Program/saves/<SaveName>/persistent.sfs`

## License

[CC BY-NC-SA 3.0](LICENSE.md) — derivative work based on KSH by OrbitalManeuvers.
