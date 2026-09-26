"""Rebuild rolling game assets from the earlier user-liked waveform.

The review preview and runtime beds share exactly one processing recipe.
"""
from pathlib import Path
import runpy

render = runpy.run_path(str(Path(__file__).with_name('build-wood-roll-previews.py')))['render']

if __name__ == '__main__':
    render('wood-passage-soft.wav', 180, 1350, .016, install=True)
    render('wood-passage-swish.wav', 300, 1850, .022, install=True)
