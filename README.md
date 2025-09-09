# ParqNU - Smart Parking Data Platform

A modern parking data platform that aggregates and visualizes parking information from Gothenburg's public APIs. Built with Next.js and containerized for easy deployment.

## Features

- **Real-time Parking Data**: Fetches and aggregates parking data from multiple Gothenburg parking APIs
- **Interactive Map**: Visual representation of parking locations with Google Maps integration
- **Smart Search**: Find parking spaces by location, availability, and amenities
- **Dockerized Deployment**: Fully containerized application with automated data updates via cron jobs
- **Modern UI**: Built with Next.js, React, and Tailwind CSS for a responsive user experience

## Architecture

```
parqnu/
├── app/
│   ├── jobs/               # Python scripts for data fetching
│   │   └── download_parking_data.py
│   ├── data/              # JSON data storage
│   └── parqnu-web/        # Next.js web application
│       ├── app/           # Next.js app directory
│       ├── components/    # React components
│       └── public/        # Static assets
└── infra/                 # Infrastructure configuration
    ├── docker-compose.yml # Docker composition
    ├── Dockerfile         # Container definition
    └── crontab           # Scheduled job configuration
```

## Prerequisites

- Node.js 18+ (for local development)
- Python 3.9+ (for data fetching scripts)
- Docker & Docker Compose (for containerized deployment)
- Gothenburg Open Data API key (get it from [data.goteborg.se](https://data.goteborg.se))
- Google Maps API key (for map functionality)

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/build-for-public/parq-nu.git
   cd parq-nu
   ```

2. **Set up environment variables**
   
   Create a `.env` file in the project root:
   ```env
   GOTHENBURG_API_KEY=your_gothenburg_api_key
   ```
   
   For the web application, create `.env.local` in `app/parqnu-web/`:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

3. **Install Python dependencies**
   ```bash
   cd app/jobs
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Fetch initial parking data**
   ```bash
   python download_parking_data.py
   ```

5. **Install and run the web application**
   ```bash
   cd ../parqnu-web
   npm install
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   cd infra
   docker-compose up --build
   ```

   This will:
   - Build the Docker image
   - Start the web application on port 3000
   - Set up automated data fetching via cron jobs
   - Configure nginx for production serving

## Data Sources

The application fetches data from three Gothenburg parking APIs:

1. **Public Time Parkings**: Time-limited public parking spaces
2. **Public Toll Parkings**: Paid public parking areas
3. **Private Toll Parkings**: Private parking facilities

Data is fetched every 30 minutes and combined into a unified format with:
- Real-time availability (simulated)
- Pricing information
- Amenities (EV charging, handicap access, etc.)
- Location coordinates

## Development

### Web Application Structure

- `app/parqnu-web/app/` - Next.js app router pages
- `app/parqnu-web/components/` - Reusable React components
- `app/parqnu-web/hooks/` - Custom React hooks
- `app/parqnu-web/lib/` - Utility functions and configurations

### Adding New Features

1. **Frontend**: Add new components in `app/parqnu-web/components/`
2. **Data Processing**: Modify `app/jobs/download_parking_data.py`
3. **API Integration**: Update data fetching endpoints in the Python script

### Running Tests

```bash
cd app/parqnu-web
npm run lint
npm run build
```

## Configuration

### Cron Jobs

The Docker container runs scheduled jobs to fetch updated parking data. Edit `infra/crontab` to modify the schedule:

```cron
*/30 * * * * /usr/local/bin/python /app/jobs/download_parking_data.py >> /var/log/cron.log 2>&1
```

### Docker Configuration

- **Dockerfile**: Multi-stage build for optimized production images
- **docker-compose.yml**: Service orchestration and environment configuration
- **nginx.conf**: Production web server configuration

## API Keys

### Gothenburg Open Data API

1. Visit [data.goteborg.se](https://data.goteborg.se)
2. Register for an account
3. Generate an API key for the Parking Service
4. Add to your `.env` file

### Google Maps API

1. Visit [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Maps JavaScript API
4. Create credentials and copy the API key
5. Add to your `.env.local` file

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Python: Follow PEP 8
- JavaScript/TypeScript: Use the provided ESLint configuration
- Commit messages: Use conventional commits format

## Troubleshooting

### Common Issues

1. **API Key errors**: Ensure your Gothenburg API key is valid and properly set in `.env`
2. **Map not loading**: Check that your Google Maps API key is configured and has the necessary APIs enabled
3. **Docker build fails**: Ensure Docker Desktop is running and you have sufficient resources allocated
4. **Port conflicts**: If port 3000 is in use, modify the port mapping in `docker-compose.yml`

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [City of Gothenburg](https://goteborg.se) for providing open parking data APIs
- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Map integration via [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)

## Contact

For questions or support, please open an issue on [GitHub](https://github.com/build-for-public/parq-nu/issues).

---

Made with ❤️ for better parking experiences in Gothenburg