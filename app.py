import configparser
import json
import os
from flask import Flask, render_template, request
from cfg_parser import CFGReader
from science_parser import ScienceParser, SITUATIONS, SITUATION_LABELS

app = Flask(__name__)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'ksh.cfg')


def load_config():
    config = configparser.ConfigParser()
    config.read(CONFIG_FILE)
    save_file = config.get('ksh', 'save_file', fallback=None)
    return save_file.strip() if save_file else None


def bodies_to_json(bodies):
    def _serialize(obj):
        if isinstance(obj, set):
            return sorted(list(obj))
        if isinstance(obj, dict):
            return {k: _serialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_serialize(i) for i in obj]
        return obj

    exp_registry = {}
    for body in bodies:
        for biome in body['biomes']:
            for exp in biome['experiments']:
                if exp['id'] not in exp_registry:
                    exp_registry[exp['id']] = exp['title']

    experiments = sorted(
        [{'id': k, 'title': v} for k, v in exp_registry.items()],
        key=lambda e: e['title'].lower()
    )

    return json.dumps({
        'situations': SITUATIONS,
        'situation_labels': SITUATION_LABELS,
        'experiments': experiments,
        'bodies': _serialize(bodies),
    })


def parse_save(file_path):
    """Parse a save file and return (game_title, science_json, error)."""
    if not os.path.isfile(file_path):
        return None, 'null', f'File not found: {file_path}'
    try:
        reader = CFGReader(file_path)
        if reader.root is None:
            return None, 'null', 'Could not parse file — is this a valid KSP save?'
        parser = ScienceParser(reader.root)
        bodies = parser.get_results()
        if not bodies:
            return None, 'null', 'No science data found. Have you done any science in this save?'
        return parser.game_title, bodies_to_json(bodies), None
    except Exception as e:
        return None, 'null', f'Parse error: {e}'


@app.route('/', methods=['GET', 'POST'])
def index():
    error = None
    game_title = None
    science_json = 'null'
    configured_path = load_config()

    if configured_path:
        file_path = configured_path
        game_title, science_json, error = parse_save(file_path)
    elif request.method == 'POST':
        file_path = request.form.get('file_path', '').strip()
        if not file_path:
            error = 'Please enter a file path.'
        else:
            game_title, science_json, error = parse_save(file_path)
    else:
        file_path = None

    return render_template(
        'index.html',
        error=error,
        game_title=game_title,
        file_path=file_path,
        configured_path=configured_path,
        science_json=science_json,
    )


if __name__ == '__main__':
    app.run(debug=True, port=5001)
