"""Build seamless wood-passage texture beds from the user's existing video audio.

Inputs are temporary mono PCM WAVs extracted with afconvert, never the original MP4s.
The impact sounds are separate and deliberately untouched.
"""
from array import array
from pathlib import Path
import math
import random
import struct
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
DURATION = 3.6
GRAIN = int(RATE * .14)
HOP = GRAIN // 2


def mono_pcm(path):
    data = path.read_bytes()
    position = data.index(b'data') + 4
    size = struct.unpack_from('<I', data, position)[0]
    values = array('h')
    values.frombytes(data[position + 4:position + 4 + size])
    return [sample / 32768 for sample in values]


def low_and_high_pass(samples, high, low):
    low_alpha = 1 - math.exp(-2 * math.pi * low / RATE)
    high_alpha = math.exp(-2 * math.pi * high / RATE)
    low_state = 0.0
    prev_low = 0.0
    high_state = 0.0
    result = []
    for sample in samples:
        low_state += low_alpha * (sample - low_state)
        high_state = high_alpha * (high_state + low_state - prev_low)
        prev_low = low_state
        result.append(high_state)
    return result


def build(source, start, stop, max_rms, high, low, target_rms, seed, destination):
    source = low_and_high_pass(mono_pcm(source), high, low)
    first, last = round(start * RATE), round(stop * RATE)
    candidates = []
    for position in range(first, last - GRAIN, HOP // 2):
        grain = source[position:position + GRAIN]
        rms = math.sqrt(sum(sample * sample for sample in grain) / GRAIN)
        peak = max(map(abs, grain))
        if .0005 < rms < max_rms and peak < max(.01, rms * 6):
            candidates.append((position, rms))
    if len(candidates) < 5:
        raise ValueError(f'Not enough smooth source grains: {destination}: {len(candidates)}')
    randomizer = random.Random(seed)
    count = round(DURATION * RATE)
    output = [0.0] * (count + GRAIN)
    weights = [0.0] * (count + GRAIN)
    window = [.5 - .5 * math.cos(2 * math.pi * i / (GRAIN - 1)) for i in range(GRAIN)]
    for offset in range(0, count + GRAIN // 2, HOP):
        position, rms = randomizer.choice(candidates)
        grain_scale = min(3, max(.3, .0025 / rms))
        for index in range(GRAIN):
            at = offset + index
            if at >= len(output):
                break
            envelope = window[index]
            output[at] += source[position + index] * grain_scale * envelope
            weights[at] += envelope
    output = [sample / max(.001, weight) for sample, weight in zip(output[:count], weights[:count])]
    # Remove incidental handling bumps without flattening the source's spectral texture.
    power = [0.0]
    for sample in output:
        power.append(power[-1] + sample * sample)
    source_rms = math.sqrt(power[-1] / count)
    span = round(RATE * .035)
    local_gain = []
    for i in range(count):
        a, b = max(0, i - span), min(count, i + span)
        local_rms = math.sqrt((power[b] - power[a]) / max(1, b - a))
        local_gain.append(max(.3, min(3, source_rms / max(.0001, local_rms))))
    output = [sample * gain for sample, gain in zip(output, local_gain)]
    rms = math.sqrt(sum(sample * sample for sample in output) / count)
    scale = target_rms / rms
    output = [max(-.2, min(.2, sample * scale)) for sample in output]
    # The last portion is blended into the start, making a true seamless loop.
    fade = round(RATE * .18)
    for i in range(fade):
        t = i / fade
        last_index = count - fade + i
        output[last_index] = output[last_index] * math.cos(t * math.pi / 2) + output[i] * math.sin(t * math.pi / 2)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(destination), 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(RATE)
        wav.writeframes(array('h', (round(max(-1, min(1, sample)) * 32767) for sample in output)).tobytes())
    chunks = [math.sqrt(sum(x*x for x in output[i:i+2205])/len(output[i:i+2205])) for i in range(0,count,2205)]
    print(destination.relative_to(ROOT), 'seconds', count / RATE, 'source_grains', len(candidates), 'rms_range_50ms', tuple(round(x,4) for x in (min(chunks), max(chunks))), 'peak', round(max(map(abs,output)),4))


if __name__ == '__main__':
    # Reference videos are supplied separately and kept read-only/untracked.
    for number in (1, 3):
        video = ROOT / f'{number}.mp4'
        if not video.exists():
            raise FileNotFoundError(f'Reference video required: {video}')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', '-c', '1', str(video),
                        str(ROOT / f'tests/wood-video-{number}-temp.wav')], check=True)
    build(ROOT / 'tests/wood-video-3-temp.wav', 1.32, 2.08, .006, 180, 1800, .016, 73,
          ROOT / 'assets/marble-builder/audio/wood-passage-soft.wav')
    build(ROOT / 'tests/wood-video-1-temp.wav', 1.53, 2.30, .008, 420, 4200, .022, 113,
          ROOT / 'assets/marble-builder/audio/wood-passage-swish.wav')
    for number in (1, 3):
        (ROOT / f'tests/wood-video-{number}-temp.wav').unlink()
