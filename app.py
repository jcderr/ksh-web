import os
from flask import Flask, render_template, request
from cfg_parser import CFGReader
from science_parser import ScienceParser, SITUATIONS, SITUATION_LABELS

app = Flask(__name__)


@app.route('/', methods=['GET', 'POST'])
def index():
    error = None
    results = None
    game_title = None
    file_path = None
    bodies = []

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
            except Exception as e:
                error = f'Parse error: {e}'

    return render_template(
        'index.html',
        error=error,
        game_title=game_title,
        file_path=file_path,
        bodies=bodies,
        situations=SITUATIONS,
        situation_labels=SITUATION_LABELS,
    )


if __name__ == '__main__':
    app.run(debug=True, port=5001)
