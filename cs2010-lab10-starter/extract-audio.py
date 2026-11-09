#!/usr/bin/env python3
"""Extract audio + lyrics from a saved OpenRouter audio-model response.

Works on both shapes, because OpenRouter returns audio in the same place either
way -- only the container differs:

  streaming (stream: true, required for audio):
      data: {"choices":[{"delta":{"audio":{"data":"<base64>"}, "content":"..."}}]}
      ... terminated by "data: [DONE]"

  non-streaming (what you get for image models; audio models reject it):
      {"choices":[{"message":{"audio":{"data":"<base64>"}, "content":"..."}}]}

Each base64 blob is decoded on its own and the bytes are concatenated, so this
also works if the provider ever splits the audio across several chunks.

Usage:  ./extract-audio.py song-response.sse -o song.mp3 [-l song-lyrics.txt]
"""

import argparse
import base64
import json
import sys


def iter_payloads(path):
    """Yield JSON objects from an SSE body or a plain JSON body."""
    raw = open(path, "r", encoding="utf-8", errors="replace").read()

    stripped = raw.lstrip()
    if stripped.startswith("{"):
        # Non-streaming: a single JSON document.
        yield json.loads(stripped)
        return

    for line in raw.splitlines():
        if not line.startswith("data:"):
            continue  # SSE comments like ": OPENROUTER PROCESSING" are keepalives
        payload = line[5:].strip()
        if not payload or payload == "[DONE]":
            continue
        yield json.loads(payload)


def extract(path):
    audio = bytearray()
    text = []
    for obj in iter_payloads(path):
        for choice in obj.get("choices") or []:
            for container in (choice.get("delta"), choice.get("message")):
                if not container:
                    continue
                blob = container.get("audio") or {}
                if blob.get("data"):
                    audio += base64.b64decode(blob["data"])
                if container.get("content"):
                    text.append(container["content"])
    return bytes(audio), "".join(text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("response", help="saved response body (.sse or .json)")
    ap.add_argument("-o", "--out", default="output/song.mp3",
                    help="audio output path")
    ap.add_argument("-l", "--lyrics", default="tmp/song-lyrics.txt",
                    help="lyrics/structure output path ('' to skip)")
    args = ap.parse_args()

    audio, lyrics = extract(args.response)

    if not audio:
        sys.exit(f"no audio data found in {args.response} "
                 f"(did the request include modalities and stream: true?)")

    with open(args.out, "wb") as f:
        f.write(audio)
    print(f"wrote {args.out} ({len(audio)} bytes)")

    if args.lyrics and lyrics:
        with open(args.lyrics, "w", encoding="utf-8") as f:
            f.write(lyrics)
        print(f"wrote {args.lyrics} ({len(lyrics)} chars)")


if __name__ == "__main__":
    main()
