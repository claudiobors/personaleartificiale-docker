FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV WHISPER_MODEL_SIZE=small
ENV WHISPER_COMPUTE_TYPE=int8
ENV WHISPER_LANGUAGE=it
ENV EDGE_TTS_VOICE=it-IT-IsabellaNeural

EXPOSE 8090

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
