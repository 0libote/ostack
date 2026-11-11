"""Merge only changes since the recorded upstream revision; never emit conflicts."""
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def merge(base, local, upstream, output):
    """Merge directory trees, failing atomically on conflicting edits."""
    def tree(root):
        result = {}
        for p in root.rglob('*'):
            if p.is_symlink():
                result[p.relative_to(root)] = ('link', os.readlink(p), False)
            elif p.is_file():
                result[p.relative_to(root)] = ('file', p.read_bytes(), bool(p.stat().st_mode & 0o111))
        return result

    old, ours, theirs = map(tree, (base, local, upstream))
    merged = {}
    for path in old.keys() | ours.keys() | theirs.keys():
        b, l, u = old.get(path), ours.get(path), theirs.get(path)
        if u == b or l == u:
            value = l
        elif l == b:
            value = u
        elif b is None or l is None or u is None:
            raise ValueError(f'Conflicting addition/deletion: {path}')
        elif l[0] == 'link' or b[0] == 'link' or u[0] == 'link':
            raise ValueError(f'Conflicting symlink: {path}')
        else:
            with tempfile.TemporaryDirectory() as tmp:
                files = [Path(tmp) / name for name in ('local', 'base', 'upstream')]
                for f, v in zip(files, (l, b, u)):
                    f.write_bytes(v[1])
                result = subprocess.run(['git', 'merge-file', '-p', *map(str, files)], capture_output=True)
                if result.returncode:
                    raise ValueError(f'Conflicting edits: {path}')
                executable = u[2] if l[2] == b[2] else l[2]
                value = ('file', result.stdout, executable)
        if value is not None:
            merged[path] = value
    output.mkdir(parents=True)
    for path, (kind, data, executable) in merged.items():
        p = output / path
        p.parent.mkdir(parents=True, exist_ok=True)
        if kind == 'link':
            p.symlink_to(data)
        else:
            p.write_bytes(data)
            p.chmod(0o755 if executable else 0o644)


if __name__ == '__main__':
    # Materialize exactly the same upstream mapping at the recorded revision.
    clone, revision, mapping, local, upstream, output = sys.argv[1:]
    import json
    source = json.loads(mapping)
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        paths = source['files'] if 'files' in source else [source['upstream_path']]
        entries = subprocess.check_output(['git', '-C', clone, 'ls-tree', '-rz', revision, '--', *paths])
        for entry in entries.split(b'\0'):
            if not entry:
                continue
            meta, name = entry.split(b'\t', 1)
            mode, kind, blob = meta.decode().split()
            if kind != 'blob' or mode not in ('100644', '100755', '120000'):
                raise ValueError(f'Unsupported upstream entry: {name!r}')
            name = name.decode()
            relative = Path(name) if 'files' in source else Path(name).relative_to(source['upstream_path'])
            p = base / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            if mode == '120000':
                p.symlink_to(subprocess.check_output(['git', '-C', clone, 'cat-file', 'blob', blob]).decode())
            else:
                p.write_bytes(subprocess.check_output(['git', '-C', clone, 'cat-file', 'blob', blob]))
                p.chmod(int(mode, 8))
        try:
            merge(base, Path(local), Path(upstream), Path(output))
        except ValueError as error:
            print(error, file=sys.stderr)
            sys.exit(1)
