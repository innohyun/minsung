"""Synthesize clean wood-passage beds; never copy phone-video audio into game loops.

The videos are references for the slow/fast contrast only. Continuous filtered
noise has no microphone handling, speech, or rustling from the recordings.
The existing short wood-hit samples and runtime speed/volume logic are separate.
"""
from array import array
from pathlib import Path
import math
import random
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
DURATION = 3.6


def smooth_passage(seed, high, low, target_rms, destination):
    fade = round(RATE * .18)
    count = round(DURATION * RATE) + fade
    randomizer = random.Random(seed)
    low_alpha = 1 - math.exp(-2 * math.pi * low / RATE)
    high_alpha = math.exp(-2 * math.pi * high / RATE)
    low_state = previous_low = high_state = previous_high = second_high = 0.0
    output = []
    for _ in range(count):
        # This is entirely new noise, NOT a randomized grain of either video.
        sample = randomizer.uniform(-1, 1)
        low_state += low_alpha * (sample - low_state)
        high_state = high_alpha * (high_state + low_state - previous_low)
        previous_low = low_state
        second_high = high_alpha * (second_high + high_state - previous_high)
        previous_high = high_state
        output.append(second_high)

    rms = math.sqrt(sum(sample * sample for sample in output) / count)
    scale = target_rms / rms
    # Round stray noise peaks without imposing any rhythmic envelope or pitch.
    output = [.048 * math.tanh(sample * scale / .048) for sample in output]
    limited_rms = math.sqrt(sum(sample * sample for sample in output) / count)
    output = [sample * (target_rms / limited_rms) for sample in output]
    # Trim the overlapped prefix: last sample then leads naturally to first.
    for i in range(fade):
        t = i / fade
        at = count - fade + i
        output[at] = output[at] * math.cos(t * math.pi / 2) + output[i] * math.sin(t * math.pi / 2)
    output = output[fade:]

    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(array('h', (round(max(-1, min(1, sample)) * 32767) for sample in output)).tobytes())
    print(destination.relative_to(ROOT), 'seconds', len(output) / RATE,
          'rms', round(math.sqrt(sum(x*x for x in output) / len(output)), 5),
          'peak', round(max(map(abs, output)), 5))


if __name__ == '__main__':
    base = ROOT / 'assets/marble-builder/audio'
    smooth_passage(73, 320, 1800, .016, base / 'wood-passage-soft.wav')
    smooth_passage(113, 650, 4200, .022, base / 'wood-passage-swish.wav')
