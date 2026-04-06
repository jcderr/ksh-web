"""
Port of u_CFGNode.pas, u_CFGReader.pas, and u_CFGWrapper.pas.
Parses KSP's CFG/SFS file format into a queryable node tree.
"""


class CFGNode:
    def __init__(self, parent, key):
        self.key = key
        self.parent = parent
        self.properties = {}  # ordered, first-write-wins (dupIgnore)
        self.children = []
        if parent is not None:
            parent.children.append(self)

    def add_property(self, s):
        parts = s.split('=', 1)
        if len(parts) == 2:
            name = parts[0].strip()
            value = parts[1].strip()
            if name not in self.properties:
                self.properties[name] = value


class CFGReader:
    def __init__(self, filename):
        self.filename = filename
        self.root = None
        self._lines = []
        self._index = -1

        with open(filename, 'r', encoding='utf-8', errors='replace') as f:
            self._lines = [line.strip() for line in f]

        self._parse()

    def _eval_line(self):
        """
        Classify the current line. Returns the line type as a string.
        For 'begin_object', also advances self._index past the '{' line.
        """
        s = self._lines[self._index]

        if s.startswith('//'):
            return 'comment'
        elif s == '}':
            return 'end_object'
        else:
            p = s.find('=')
            # name=value: '=' exists and is not the first char
            if p > 0:
                return 'name_value'
            else:
                # object start: no spaces, followed by a '{' on the next non-blank line
                if s and ' ' not in s:
                    next_idx = self._index + 1
                    while next_idx < len(self._lines) and self._lines[next_idx] == '':
                        next_idx += 1
                    if next_idx < len(self._lines) and self._lines[next_idx] == '{':
                        self._index = next_idx  # consume the '{' line
                        return 'begin_object'
        return 'unknown'

    def _parse(self):
        current = None

        while True:
            # advance to next non-blank line
            self._index += 1
            while self._index < len(self._lines) and self._lines[self._index] == '':
                self._index += 1
            if self._index >= len(self._lines):
                break

            line_before_eval = self._lines[self._index]
            line_type = self._eval_line()

            if self.root is None and line_type != 'begin_object':
                raise ValueError('File must begin with an object')

            if line_type == 'begin_object':
                if self.root is not None and current is None:
                    raise ValueError('Multiple root nodes detected')
                node = CFGNode(current, line_before_eval)
                if self.root is None:
                    self.root = node
                current = node

            elif line_type == 'end_object':
                if current is not None:
                    current = current.parent

            elif line_type == 'name_value':
                if current is not None:
                    current.add_property(line_before_eval)


class CFGWrapper:
    def __init__(self, root):
        self.root = root

    def find_nodes(self, query, root=None):
        """
        Query format: 'KEY' or 'KEY.property' or 'KEY.property=value'
        Searches direct children of root (or self.root if not provided).
        'KEY.property' (no =) means the property must be non-blank (wildcard).
        Returns a list of matching CFGNode objects.
        """
        search_root = root if root is not None else self.root
        if search_root is None:
            return []

        results = []

        # parse query: split on first '.' to get node key and optional filter
        parts = query.split('.', 1)
        node_key = parts[0].strip()
        prop_name = None
        prop_value = None

        if len(parts) > 1:
            prop_parts = parts[1].split('=', 1)
            prop_name = prop_parts[0].strip()
            prop_value = prop_parts[1].strip() if len(prop_parts) > 1 else '*'

        for child in search_root.children:
            if child.key.lower() != node_key.lower():
                continue

            if prop_name is not None:
                v = child.properties.get(prop_name, '')
                if prop_value == '*':
                    if not v:
                        continue
                else:
                    if v.lower() != prop_value.lower():
                        continue

            results.append(child)

        return results
