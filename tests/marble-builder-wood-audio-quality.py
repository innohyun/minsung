"""Protect the wood passage beds from low rumble, taps, and loop-boundary clicks.

Waveform checks complement browser playback tests; they cannot certify how the
sound is perceived by a listener.
"""
from array import array
from pathlib import Path
import math
import wave

AUDIO = Path(__file__).resolve().parents[1] / 'assets/marble-builder/audio'
for name, target in [('wood-passage-soft.wav', .016), ('wood-passage-swish.wav', .022)]:
    with wave.open(str(AUDIO / name)) as audio:
        assert (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) == (44100, 1, 2)
        assert audio.getnframes() == 158760
        samples = array('h', audio.readframes(audio.getnframes()))
    values = [sample / 32768 for sample in samples]
    rms = math.sqrt(sum(sample * sample for sample in values) / len(values))
    assert abs(rms - target) < .002, (name, rms)
    # Noticeable recording-handling bursts should not recur in the loop.
    window = 2205
    levels = [math.sqrt(sum(x*x for x in values[i:i+window]) / len(values[i:i+window]))
              for i in range(0, len(values), window)]
    assert max(levels) / min(levels) < 2, (name, min(levels), max(levels))
    crest = max(map(abs, values)) / rms
    assert crest < 3.6, (name, crest)
    low = 0.0
    low_power = 0.0
    alpha = 1 - math.exp(-2 * math.pi * 300 / 44100)
    for sample in values:
        low += alpha * (sample - low)
        low_power += low * low
    low_ratio = math.sqrt(low_power / len(values)) / rms
    assert low_ratio < .4, (name, low_ratio)
    steps = sorted(abs(values[i] - values[i-1]) for i in range(1, len(values)))
    seam = abs(values[0] - values[-1])
    assert seam < steps[int(len(steps) * .95)], (name, seam)
    print('PASS', name, 'rms', round(rms, 4), 'crest', round(crest, 2),
          'low-300-Hz ratio', round(low_ratio, 2), 'loop-boundary delta', round(seam, 5))
