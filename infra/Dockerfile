
FROM node:22-alpine AS nextjs-builder

# Build-time env for Next.js (public env)
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

WORKDIR /app


COPY app/parqnu-web/package*.json ./
RUN npm ci --legacy-peer-deps

COPY app/parqnu-web/ ./


RUN npm run build && \
    (npm run export || npx next export || echo "Static export may not be configured")


FROM python:3.11-slim


RUN apt-get update && apt-get install -y \
    nginx \
    cron \
    supervisor \
    && rm -rf /var/lib/apt/lists/*


RUN mkdir -p /app/jobs /app/data /app/web


WORKDIR /app


COPY app/jobs/download_parking_data.py /app/jobs/
COPY app/jobs/requirements.txt /app/jobs/


RUN python -m venv /app/venv
RUN /app/venv/bin/pip install --upgrade pip
RUN /app/venv/bin/pip install requests python-dotenv


COPY --from=nextjs-builder /app/out /usr/share/nginx/html
RUN mkdir -p /usr/share/nginx/html/_next/static


RUN ln -s /app/data /usr/share/nginx/html/data

# Copy configuration files
COPY infra/nginx.conf /etc/nginx/sites-available/default
COPY infra/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY infra/crontab /etc/cron.d/parking-data-cron
COPY infra/entrypoint.sh /app/entrypoint.sh

# Set permissions
RUN chmod 0644 /etc/cron.d/parking-data-cron && \
    chmod +x /app/entrypoint.sh && \
    crontab /etc/cron.d/parking-data-cron

# Expose port 80 for nginx
EXPOSE 80

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
