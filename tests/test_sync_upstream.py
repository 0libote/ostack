import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('merge_upstream', Path(__file__).resolve().parents[1] / '.github/scripts/merge-upstream.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MergeTests(unittest.TestCase):
    def check_merge(self, base, local, upstream, expected=None, conflict=False):
        with tempfile.TemporaryDirectory() as tmp:
            dirs = [Path(tmp) / name for name in ('base', 'local', 'upstream', 'output')]
            for root, files in zip(dirs, (base, local, upstream)):
                root.mkdir()
                for name, text in files.items():
                    (root / name).write_text(text)
            if conflict:
                with self.assertRaises(ValueError):
                    module.merge(*dirs)
                self.assertFalse(dirs[3].exists())
            else:
                module.merge(*dirs)
                self.assertEqual({p.name: p.read_text() for p in dirs[3].iterdir()}, expected)

    def test_local_customization_alone_is_not_an_update(self):
        self.check_merge({'skill': 'Sol'}, {'skill': 'chosen model'}, {'skill': 'Sol'}, {'skill': 'chosen model'})

    def test_independent_upstream_change_preserves_customization(self):
        base = 'Sol\n' + 'unchanged\n' * 8 + 'old behavior\n'
        self.check_merge({'skill': base}, {'skill': base.replace('Sol', 'chosen model')},
                         {'skill': base.replace('old behavior', 'new behavior')},
                         {'skill': base.replace('Sol', 'chosen model').replace('old behavior', 'new behavior')})

    def test_conflicting_edit_is_atomic(self):
        self.check_merge({'skill': 'Sol'}, {'skill': 'chosen model'}, {'skill': 'another model'}, conflict=True)

    def test_deleting_locally_modified_file_conflicts(self):
        self.check_merge({'skill': 'old'}, {'skill': 'custom'}, {}, conflict=True)

    def test_additions_deletions_and_local_only_files(self):
        self.check_merge({'removed': 'old'}, {'removed': 'old', 'personal': 'keep'}, {'added': 'new'},
                         {'personal': 'keep', 'added': 'new'})

    def test_concurrent_addition_conflicts(self):
        self.check_merge({}, {'skill': 'custom'}, {'skill': 'new'}, conflict=True)


if __name__ == '__main__':
    unittest.main()
