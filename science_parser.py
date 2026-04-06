"""
Port of u_CFGScienceParser.pas, extended with biome support.
Extracts science experiment results from a parsed KSP save file tree.

KSP science ID format: experimentId@BodyNameSituationBiome
  e.g.  crewReport@KerbinFlyingLowShores
          body=Kerbin, situation=FlyingLow, biome=Shores
        mysteryGoo@KerbinFlyingLow
          body=Kerbin, situation=FlyingLow, biome="" (global/no biome)
"""

from cfg_parser import CFGWrapper

SITUATIONS = ['SrfLanded', 'SrfSplashed', 'FlyingLow', 'FlyingHigh', 'InSpaceLow', 'InSpaceHigh']

SITUATION_LABELS = {
    'SrfLanded':   'Landed',
    'SrfSplashed': 'Splashed',
    'FlyingLow':   'Fly Low',
    'FlyingHigh':  'Fly High',
    'InSpaceLow':  'Space Low',
    'InSpaceHigh': 'Space High',
}

GLOBAL_BIOME = '(Global)'


def _trim_title(title):
    """Strip the situational suffix from an experiment title."""
    idx = title.find(' from ')
    if idx < 0:
        idx = title.find(' while ')
    if idx >= 0:
        return title[:idx].strip()
    return title.strip()


class ScienceParser:
    def __init__(self, root):
        self._root = root
        # exp_id -> display title
        self._experiments = {}
        # body_name -> biome_name -> exp_id -> set of situation strings
        self._data = {}
        self._parse()

    @property
    def game_title(self):
        return self._root.properties.get('Title', '')

    def get_results(self):
        """
        Returns a sorted list of body dicts:
          {
            'name': str,
            'biomes': [
              {
                'name': str,          # biome name, or GLOBAL_BIOME for unbiomed
                'experiments': [
                  { 'id': str, 'title': str, 'situations': set }
                ]
              }
            ]
          }
        Bodies sorted alphabetically. Within each body, biomes sorted
        (global first, then alphabetical). Experiments sorted by title.
        """
        output = []
        for body_name in sorted(self._data):
            biomes_data = self._data[body_name]
            biomes = []
            for biome_name in sorted(biomes_data, key=lambda b: (b != GLOBAL_BIOME, b.lower())):
                exps_data = biomes_data[biome_name]
                exps = []
                for exp_id, situations in exps_data.items():
                    title = self._experiments.get(exp_id, exp_id)
                    exps.append({'id': exp_id, 'title': title, 'situations': situations})
                exps.sort(key=lambda e: e['title'].lower())
                biomes.append({'name': biome_name, 'experiments': exps})
            output.append({'name': body_name, 'biomes': biomes})
        return output

    def _parse(self):
        wrapper = CFGWrapper(self._root)
        scenarios = wrapper.find_nodes('SCENARIO.name=ResearchAndDevelopment')
        if not scenarios:
            return
        rd_node = scenarios[0]
        science_nodes = wrapper.find_nodes('Science.id', root=rd_node)
        for node in science_nodes:
            self._parse_science_node(node)

    def _parse_science_node(self, node):
        id_val = node.properties.get('id', '')
        parts = id_val.split('@', 1)
        if len(parts) < 2:
            return

        exp_id = parts[0]

        # skip experiments with no science gain
        try:
            if float(node.properties.get('sci', '0')) == 0:
                return
        except ValueError:
            return

        title = _trim_title(node.properties.get('title', exp_id))
        if exp_id not in self._experiments:
            self._experiments[exp_id] = title

        remainder = parts[1]
        for situation in SITUATIONS:
            idx = remainder.find(situation)
            if idx >= 0:
                body_name = remainder[:idx]
                biome = remainder[idx + len(situation):]
                biome_key = biome if biome else GLOBAL_BIOME

                body = self._data.setdefault(body_name, {})
                biome_dict = body.setdefault(biome_key, {})
                biome_dict.setdefault(exp_id, set()).add(situation)
                break
