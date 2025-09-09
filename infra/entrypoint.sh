#!/bin/bash

# Run the parking data script once on startup
echo "Running initial parking data download..."
cd /app && /app/venv/bin/python /app/jobs/download_parking_data.py

# Copy data to public folder if exists
if [ -f /app/data/combined_parking_data.json ]; then
    cp /app/data/combined_parking_data.json /usr/share/nginx/html/data/ 2>/dev/null || true
fi

# Start supervisor to manage nginx and cron
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf