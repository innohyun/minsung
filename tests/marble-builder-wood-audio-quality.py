"""Check that the runtime beds contain the recovered rolling texture, not white noise.

Waveform checks do not certify subjective sound quality or complete rustle removal.
"""
from array import array
import io
import json
from pathlib import Path
import math
import subprocess
import wave

AUDIO = Path(__file__).resolve().parents[1] / 'assets/marble-builder/audio'
ROOT = AUDIO.parents[2]
recipe = (ROOT / 'tests/build-wood-passage-audio.py').read_text()
processor = (ROOT / 'tests/build-wood-roll-previews.py').read_text()
assert 'build-wood-roll-previews.py' in recipe
assert "'6fd14a0:assets/marble-builder/audio/{name}'" in processor
assert 'randomizer.uniform(-1, 1)' not in processor
manifest = json.loads((AUDIO.parent / 'assets.json').read_text())
passage = next(item for item in manifest['audio'] if item['id'] == 'wood-passage-rolling-restored')
assert 'filtered rolling waveform' in passage['source']
for name, target in [('wood-passage-soft.wav', .016), ('wood-passage-swish.wav', .022)]:
    with wave.open(str(AUDIO / name)) as audio:
        assert (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) == (44100, 1, 2)
        assert audio.getnframes() == 150822
        samples = array('h', audio.readframes(audio.getnframes()))
    values = [sample / 32768 for sample in samples]
    rms = math.sqrt(sum(sample * sample for sample in values) / len(values))
    assert abs(rms - target) < .002, (name, rms)
    window = 2205
    levels = [math.sqrt(sum(x*x for x in values[i:i+window]) / len(values[i:i+window]))
              for i in range(0, len(values), window)]
    assert max(levels) / min(levels) < 2.2, (name, min(levels), max(levels))
    crest = max(map(abs, values)) / rms
    assert crest < 4.2, (name, crest)
    low = low_power = 0.0
    alpha = 1 - math.exp(-2 * math.pi * 300 / 44100)
    for sample in values:
        low += alpha * (sample - low)
        low_power += low * low
    low_ratio = math.sqrt(low_power / len(values)) / rms
    assert low_ratio < .48, (name, low_ratio)
    steps = sorted(abs(values[i] - values[i-1]) for i in range(1, len(values)))
    seam = abs(values[0] - values[-1])
    assert seam < steps[int(len(steps) * .95)], (name, seam)
    # The body of the loop must retain the old rolling waveform. A fresh
    # noise bed or a recorded-only hiss path should fail this correlation.
    previous = subprocess.check_output(['git', 'show',
        f'6fd14a0:assets/marble-builder/audio/{name}'], cwd=ROOT)
    with wave.open(io.BytesIO(previous)) as source:
        original = array('h', source.readframes(source.getnframes()))
    offset = round(44100 * .18)
    length = len(samples) - offset
    a, b = samples[:length], original[offset:offset+length]
    correlation = sum(x*y for x, y in zip(a, b)) / math.sqrt(
        sum(x*x for x in a) * sum(y*y for y in b))
    assert correlation > .5, (name, correlation)
    print('PASS', name, 'rms', round(rms, 4), 'old-rolling-correlation',
          round(correlation, 2), 'loop-boundary delta', round(seam, 5))
