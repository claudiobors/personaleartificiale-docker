import os
import re
import subprocess
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from faster_whisper import WhisperModel
import edge_tts
import yt_dlp

WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
WHISPER_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "it")
EDGE_TTS_VOICE = os.environ.get("EDGE_TTS_VOICE", "it-IT-IsabellaNeural")

model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type=WHISPER_COMPUTE_TYPE)
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health():
    return {"ok": True, "model": WHISPER_MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(request: Request):
    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(400, "Corpo audio vuoto.")
    suffix = request.query_params.get("ext", ".ogg")
    if not suffix.startswith("."):
        suffix = f".{suffix}"

    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        segments, info = model.transcribe(tmp.name, language=WHISPER_LANGUAGE, beam_size=1, vad_filter=True)
        text = "".join(segment.text for segment in segments).strip()

    return {"text": text, "language": info.language}


def _extract_subtitle_text(tmpdir):
    for filename in sorted(os.listdir(tmpdir)):
        if not (filename.endswith(".vtt") or filename.endswith(".srt")):
            continue
        with open(os.path.join(tmpdir, filename), "r", encoding="utf-8", errors="ignore") as handle:
            content = handle.read()
        lines = []
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped or "-->" in stripped or stripped.isdigit() or stripped.upper() == "WEBVTT":
                continue
            clean = re.sub(r"<[^>]+>", "", stripped).strip()
            if clean and (not lines or lines[-1] != clean):
                lines.append(clean)
        if lines:
            return " ".join(lines)
    return None


@app.post("/video/transcript")
async def video_transcript(request: Request):
    payload = await request.json()
    url = str(payload.get("url") or "").strip()
    if not url:
        raise HTTPException(400, "URL mancante.")

    with tempfile.TemporaryDirectory() as tmpdir:
        subtitle_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["it", "en"],
            "outtmpl": os.path.join(tmpdir, "%(id)s.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(subtitle_opts) as ydl:
                info = ydl.extract_info(url, download=True)
        except Exception as error:  # noqa: BLE001
            raise HTTPException(422, f"Impossibile leggere questo link video: {error}") from error

        title = info.get("title") or ""
        duration = info.get("duration") or 0
        subtitle_text = _extract_subtitle_text(tmpdir)
        if subtitle_text:
            return {"text": subtitle_text, "source": "captions", "title": title, "durationSeconds": duration}

        audio_opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(tmpdir, "audio.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
        }
        try:
            with yt_dlp.YoutubeDL(audio_opts) as ydl:
                ydl.download([url])
        except Exception as error:  # noqa: BLE001
            raise HTTPException(422, f"Impossibile scaricare l'audio del video: {error}") from error

        audio_files = [f for f in os.listdir(tmpdir) if f.startswith("audio.")]
        if not audio_files:
            raise HTTPException(422, "Nessun sottotitolo disponibile e audio non scaricabile per questo video.")
        audio_path = os.path.join(tmpdir, audio_files[0])
        segments, _info = model.transcribe(audio_path, language=WHISPER_LANGUAGE, beam_size=1, vad_filter=True)
        text = "".join(segment.text for segment in segments).strip()
        return {"text": text, "source": "whisper", "title": title, "durationSeconds": duration}


@app.post("/synthesize")
async def synthesize(request: Request):
    payload = await request.json()
    text = str(payload.get("text", "")).strip()[:2000]
    if not text:
        raise HTTPException(400, "Testo vuoto.")
    voice = str(payload.get("voice") or EDGE_TTS_VOICE)
    output_format = str(payload.get("format") or "mp3")

    with tempfile.NamedTemporaryFile(suffix=".mp3") as mp3_file:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(mp3_file.name)

        if output_format == "ogg":
            with tempfile.NamedTemporaryFile(suffix=".ogg") as ogg_file:
                result = subprocess.run(
                    ["ffmpeg", "-y", "-i", mp3_file.name, "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", ogg_file.name],
                    capture_output=True,
                )
                if result.returncode != 0:
                    raise HTTPException(500, f"Conversione audio non riuscita: {result.stderr.decode(errors='ignore')[:500]}")
                ogg_file.seek(0)
                audio_bytes = ogg_file.read()
            return Response(content=audio_bytes, media_type="audio/ogg")

        mp3_file.seek(0)
        return Response(content=mp3_file.read(), media_type="audio/mpeg")
