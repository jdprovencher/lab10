#!/usr/bin/env bash
# Turn a lyrics/description file into a song with google/lyria-3-pro-preview.
#
#   ./gen-lyrics.sh && ./gen-song.sh         chains on the defaults:
#                                            output/lyrics.txt -> output/song.mp3
#   ./gen-song.sh some/other/prompt.txt      explicit prompt file
#   MODEL=google/lyria-3-clip-preview ./gen-song.sh   (cheaper, 30s clip)
#   NAME=noel ./gen-song.sh                  -> output/noel.mp3
#
# Layout:
#   tmp/     request body, response headers, raw SSE, extracted lyrics
#   output/  the finished .mp3
#
# The full HTTP response body is written straight to a file by curl (-o) and is
# never parsed, filtered or extracted on the way in. Decoding happens afterwards,
# as a separate step, from that saved file.

set -uo pipefail

cd "$(dirname "$0")" || exit 1

if [ -f openrouter.env ]; then
  # shellcheck disable=SC1091
  . ./openrouter.env
fi
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is not set (source openrouter.env)}"

MODEL="${MODEL:-google/lyria-3-pro-preview}"
NAME="${NAME:-song}"

TMP=tmp
OUTDIR=output
PROMPT_FILE="${1:-$OUTDIR/lyrics.txt}"
REQ="$TMP/$NAME-request.json"
HDR="$TMP/$NAME-response.headers"
RAW="$TMP/$NAME-response.sse"
MP3="$OUTDIR/$NAME.mp3"
LYRICS="$TMP/$NAME-lyrics.txt"

if [ ! -f "$PROMPT_FILE" ]; then
  echo "prompt file not found: $PROMPT_FILE" >&2
  echo "run ./gen-lyrics.sh first, or pass a prompt file: ./gen-song.sh <file>" >&2
  exit 1
fi

mkdir -p "$TMP" "$OUTDIR"

# Build the request body. jq --rawfile embeds the prompt as a proper JSON string.
# Two fields are mandatory for audio and are not in the model's llms.txt:
#   modalities: ["text","audio"]  -> without it you get text only (lyrics)
#   stream: true                  -> the API rejects audio output otherwise
#                                    with 400 "Audio output requires stream: true"
jq -n \
  --rawfile prompt "$PROMPT_FILE" \
  --arg model "$MODEL" \
  '{
     model: $model,
     modalities: ["text", "audio"],
     stream: true,
     messages: [{ role: "user", content: $prompt }]
   }' > "$REQ" || { echo "failed to build $REQ" >&2; exit 1; }

echo "model      : $MODEL"
echo "prompt file: $PROMPT_FILE ($(wc -c < "$PROMPT_FILE") bytes)"
echo "request    : $REQ"
echo "POST https://openrouter.ai/api/v1/chat/completions"
echo

# -o writes the raw response body to $RAW. Nothing touches it on the way.
# -N disables curl's buffering so SSE chunks land in the file as they arrive.
# -w's output goes to stdout, so it is captured here rather than in the body.
stats=$(curl -sS -N --max-time 900 \
  -D "$HDR" \
  -o "$RAW" \
  -w '%{http_code} %{size_download} %{time_total}' \
  -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$REQ")
rc=$?

read -r status bytes secs <<<"$stats"
echo "curl exit  : $rc"
echo "HTTP       : ${status:-?}  ${bytes:-0} bytes  ${secs:-?}s"
echo "body       : $RAW ($(wc -c < "$RAW" 2>/dev/null || echo 0) bytes)"

if [ "$rc" -ne 0 ] || [ "${status:-}" != "200" ]; then
  echo >&2
  echo "request failed; raw body left in $RAW" >&2
  # Errors are small, so showing one is safe. Never echo a song-sized body.
  if [ "$(wc -c < "$RAW" 2>/dev/null || echo 0)" -lt 2000 ]; then
    echo >&2
    cat "$RAW" >&2
    echo >&2
  fi
  exit 1
fi

echo
echo "extracting audio -> $MP3"
python3 extract-audio.py "$RAW" -o "$MP3" -l "$LYRICS" || exit 1

if command -v ffprobe >/dev/null 2>&1; then
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MP3" 2>/dev/null)
  [ -n "$dur" ] && printf 'duration   : %.1fs\n' "$dur"
fi
echo "lyrics     : $LYRICS"
