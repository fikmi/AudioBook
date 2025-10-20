# LibroVox Py

LibroVox Py est une application web Flask permettant d'importer des documents (PDF, EPUB, DOCX, TXT), d'en extraire le texte côté serveur et de le lire à voix haute dans le navigateur grâce à la Web Speech API.

## Prérequis

- Python 3.10 ou supérieur
- Node.js n'est pas requis (le frontend utilise uniquement du JavaScript natif)

## Installation

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Lancement de l'application

```bash
flask --app app run
```

L'application est accessible sur http://127.0.0.1:5000.

## Fonctionnalités principales

- Upload de fichiers PDF, EPUB, DOCX et TXT (limite 50 Mo)
- Extraction serveur des contenus textuels
- Interface responsive avec Bootstrap 5
- Lecture audio dans le navigateur : sélection de voix, vitesse, pitch et volume
- Mise en évidence en temps réel de la phrase en cours de lecture avec auto-scroll
- Gestion des erreurs et messages utilisateur clairs

## Limitations connues

- Les voix disponibles dépendent de votre navigateur et de votre système d'exploitation
- Les PDF scannés (images) ne sont pas pris en charge (pas d'OCR)
- L'application ne stocke aucune donnée de lecture pour le moment (pas de signets/notes)

## Structure du projet

```
app.py
services/
  extractor.py
static/
  css/styles.css
  js/reader.js
templates/
  base.html
  index.html
```

## Licence

Projet fourni à titre d'exemple pédagogique.
