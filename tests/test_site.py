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
        self.install_agents = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and attrs.get('class') == 'skill-card':
            self.cards.append(attrs)
        if tag == 'button' and 'data-agent' in attrs:
            self.install_agents.append(attrs)
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

    def test_readme_documents_every_install_target(self):
        catalog = Catalog()
        catalog.feed((ROOT / 'site/index.html').read_text())
        readme = (ROOT / 'README.md').read_text()
        self.assertEqual(len(catalog.install_agents), 6)
        for agent in catalog.install_agents:
            with self.subTest(agent=agent['data-agent']):
                row = next(line for line in readme.splitlines()
                           if f"`{agent['data-agent']}` |" in line)
                self.assertIn(f"`{agent['data-global']}`", row)
                self.assertIn(f"`{agent['data-project']}`", row)
        self.assertNotIn('https://github.com/0libote/ostack#requirements', catalog.links)


if __name__ == '__main__':
    unittest.main()
