"""Dependency-free checks for the hand-maintained static catalog."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Catalog(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.links = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and attrs.get('class') == 'skill-card':
            self.cards.append(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])


class SiteTest(unittest.TestCase):
    def test_catalog_and_local_links(self):
        catalog = Catalog()
        catalog.feed((ROOT / 'site/index.html').read_text())
        skills = {path.parent.name for path in (ROOT / 'skills').glob('*/SKILL.md')}
        prefix = 'https://github.com/0libote/ostack/tree/main/skills/'
        linked_skills = {link.removeprefix(prefix) for link in catalog.links if link.startswith(prefix)}
        self.assertEqual(linked_skills, skills)
        self.assertEqual(len(catalog.cards), len(skills))
        self.assertEqual(len(catalog.ids), len(set(catalog.ids)))
        self.assertEqual({card['data-skill'] for card in catalog.cards}, skills)
        for card in catalog.cards:
            self.assertIn(card['data-category'], {'Ship', 'Review', 'Create', 'Maintain'})
            self.assertTrue(card['data-command'])
            self.assertTrue(card['data-steps'])
        for link in catalog.links:
            if link.startswith('#'):
                self.assertTrue(link == '#' or link[1:] in catalog.ids, link)
            elif not link.startswith('https://'):
                self.assertTrue((ROOT / 'site' / link).is_file(), link)


if __name__ == '__main__':
    unittest.main()
