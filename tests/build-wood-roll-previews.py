"""Make listening previews from the earlier user-liked rolling sound, not white noise.

Only writes review samples. Does NOT change the game's current audio assets.
Source is the tracked 6fd14a0 WAV (before the later noise-only replacement).
"""
from array import array
import io
import math
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/audio-previews'
RATE = 44100


def prior_roll(name):
    data = subprocess.check_output(['git', 'show',
        f'6fd14a0:assets/marble-builder/audio/{name}'], cwd=ROOT)
    with wave.open(io.BytesIO(data)) as sound:
        assert (sound.getframerate(), sound.getnchannels(), sound.getsampwidth()) == (RATE, 1, 2)
        pcm = array('h', sound.readframes(sound.getnframes()))
    return [sample / 32768 for sample in pcm]


def render(name, high, low, target):
    samples = prior_roll(name)
    low_alpha = 1 - math.exp(-2 * math.pi * low / RATE)
    high_alpha = math.exp(-2 * math.pi * high / RATE)
    low1 = low2 = prev_low = hp = prev_hp = hp2 = 0.0
    result = []
    for sample in samples:
        low1 += low_alpha * (sample - low1)
        low2 += low_alpha * (low1 - low2)
        hp = high_alpha * (hp + low2 - prev_low)
        prev_low = low2
        hp2 = high_alpha * (hp2 + hp - prev_hp)
        prev_hp = hp
        result.append(hp2)

    # Reduce the swells from microphone handling instead of replacing the
    # rolling waveform with an unrelated noise source.
    window = round(RATE * .045)
    squares = [0.0]
    for sample in result:
        squares.append(squares[-1] + sample * sample)
    average = math.sqrt(squares[-1] / len(result))
    leveled = []
    for i, sample in enumerate(result):
        a, b = max(0, i - window), min(len(result), i + window)
        local = math.sqrt((squares[b] - squares[a]) / max(1, b - a))
        trim = max(.65, min(1.25, (average / max(local, .00001)) ** .65))
        leveled.append(sample * trim)

    rms = math.sqrt(sum(sample * sample for sample in leveled) / len(leveled))
    # Same base level as the existing loop; previews are one-shot samples.
    leveled = [.05 * math.tanh(sample * target / rms / .05) for sample in leveled]
    rms = math.sqrt(sum(sample * sample for sample in leveled) / len(leveled))
    leveled = [sample * target / rms for sample in leveled]
    fade = round(RATE * .18)
    for i in range(fade):
        leveled[i] *= i / fade
        leveled[-i-1] *= i / fade
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / name.replace('.wav', '-candidate.wav')
    with wave.open(str(dest), 'wb') as sound:
        sound.setnchannels(1)
        sound.setsampwidth(2)
        sound.setframerate(RATE)
        sound.writeframes(array('h', (round(max(-1, min(1, sample)) * 32767) for sample in leveled)).tobytes())
    print(dest.relative_to(ROOT), 'seconds', len(leveled) / RATE,
          'rms', round(math.sqrt(sum(sample*sample for sample in leveled)/len(leveled)), 5),
          'peak', round(max(map(abs, leveled)), 5))


if __name__ == '__main__':
    render('wood-passage-soft.wav', 180, 1350, .016)
    render('wood-passage-swish.wav', 300, 1850, .022)
