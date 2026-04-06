import json
import os
from flask import Flask, render_template, request
from cfg_parser import CFGReader
from science_parser import ScienceParser, SITUATIONS, SITUATION_LABELS

app = Flask(__name__)


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


@app.route('/', methods=['GET', 'POST'])
def index():
    error = None
    game_title = None
    file_path = None
    bodies = []
    science_json = 'null'

    if request.method == 'POST':
        file_path = request.form.get('file_path', '').strip()
        if not file_path:
            error = 'Please enter a file path.'
        elif not os.path.isfile(file_path):
            error = f'File not found: {file_path}'
        else:
            try:
                reader = CFGReader(file_path)
                if reader.root is None:
                    error = 'Could not parse file — is this a valid KSP save?'
                else:
                    parser = ScienceParser(reader.root)
                    game_title = parser.game_title
                    bodies = parser.get_results()
                    if not bodies:
                        error = 'No science data found. Have you done any science in this save?'
                    else:
                        science_json = bodies_to_json(bodies)
            except Exception as e:
                error = f'Parse error: {e}'

    return render_template(
        'index.html',
        error=error,
        game_title=game_title,
        file_path=file_path,
        science_json=science_json,
    )


if __name__ == '__main__':
    app.run(debug=True, port=5001)
