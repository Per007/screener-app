# ESG Portfolio Screening Application

A comprehensive ESG (Environmental, Social, and Governance) portfolio screening application with a RESTful API backend and React frontend.

## 🚀 Features

### Backend API
- **Portfolio Screening** - Screen entire portfolios against ESG criteria
- **Individual Company Screening** - Screen single companies
- **Multiple Companies Screening** - Compare multiple companies
- **Sector Analysis** - Screen by industry sector
- **Region Analysis** - Screen by geographic region
- **Custom Screening** - Screen all companies with custom criteria
- **Authentication** - JWT-based authentication system
- **Data Management** - Companies, Portfolios, Clients, and Criteria Sets management

### Frontend
- **React + TypeScript** - Modern frontend with type safety
- **Tailwind CSS** - Beautiful, responsive UI
- **Company Management** - View and manage companies
- **Portfolio Management** - Create and manage portfolios
- **Screening Tools** - Interactive screening interface
- **Reports** - Generate and view screening reports

## 📁 Project Structure

```
SCREENER_APP/
├── src/                    # Backend source code
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   └── models/            # Type definitions
├── esg-frontend/          # React frontend application
│   └── src/
│       ├── pages/         # React pages/components
│       ├── api/           # API service layer
│       └── context/       # React context providers
├── prisma/                # Database schema and migrations
└── docs/                  # Documentation files
```

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **Prisma** ORM for database management
- **JWT** for authentication
- **Zod** for input validation

### Frontend
- **React** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation

### Database
- **Prisma** with SQLite (or your preferred database)

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Database (SQLite, PostgreSQL, MySQL, etc.)

### Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create a .env file in the root directory
cp .env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database (optional)
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000` (or your configured port).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd esg-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or your configured port).

## 📚 API Documentation

See `NEW_ENDPOINTS_DOCUMENTATION.md` for detailed API endpoint documentation.

### Main Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/companies` - List all companies
- `GET /api/portfolios` - List all portfolios
- `POST /api/screening/portfolio` - Screen a portfolio
- `POST /api/screening/company` - Screen individual company
- `POST /api/screening/companies` - Screen multiple companies
- `POST /api/screening/sector` - Screen by sector
- `POST /api/screening/region` - Screen by region
- `POST /api/screening/custom` - Custom screening

## 🧪 Testing

See `TESTING_GUIDE.md` for comprehensive testing instructions.

Run backend tests:
```bash
node test_backend.js
```

## 📖 Documentation

- `FINAL_SUMMARY.md` - Project overview and accomplishments
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `NEW_ENDPOINTS_DOCUMENTATION.md` - API endpoint documentation
- `TESTING_GUIDE.md` - Testing instructions
- `SAMPLE_MOCK_DATA.md` - Sample data and test scenarios

## 🔒 Environment Variables

Create a `.env` file in the root directory with:

```env
DATABASE_URL="your_database_url"
JWT_SECRET="your_jwt_secret_key"
PORT=3000
```

## 📝 License

ISC

## 👤 Author

Your Name

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
