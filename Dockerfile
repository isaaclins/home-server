FROM python:3.10-slim

WORKDIR /app

COPY ./application/requirements.txt .
RUN pip install -r requirements.txt

COPY ./application/server.py .
COPY ./application/pages /pages

EXPOSE 3000
CMD ["python", "server.py"]
