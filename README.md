# 💰 Money Manager

Personal finance management system for tracking accounts, transactions, and budget control

## 🚀 Features

- **Account Management**: Create and manage multiple accounts (bank, wallet, savings, investments)
- **Transaction Tracking**: Record income and expenses with categories
- **Dashboard**: View financial overview with total balance, monthly income, expenses, and balance
- **Categories**: Pre-configured categories for income and expenses
- **Modern UI**: Beautiful and responsive interface

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd money-manager
```

2. Install all dependencies:
```bash
npm run install-all
```

Or install manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

## 🎯 Usage

### Development Mode

Run both server and client simultaneously:
```bash
npm run dev
```

Or run them separately:

**Backend (Server):**
```bash
cd server
npm run dev
```
Server will run on `http://localhost:5000`

**Frontend (Client):**
```bash
cd client
npm start
```
Client will run on `http://localhost:3000`

### Production Mode

**Build the client:**
```bash
cd client
npm run build
```

**Start the server:**
```bash
cd server
npm start
```

## 📁 Project Structure

```
money-manager/
├── server/           # Backend API (Node.js/Express)
│   ├── index.js      # Main server file
│   └── package.json
├── client/           # Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── Accounts.js
│   │   │   ├── Transactions.js
│   │   │   └── AddTransaction.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
└── package.json      # Root package.json
```

## 🗄️ Database

The application uses SQLite database (`server/database.sqlite`) which is automatically created on first run.

### Database Schema

- **accounts**: Stores account information
- **categories**: Stores transaction categories
- **transactions**: Stores all financial transactions

## 📡 API Endpoints

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Statistics
- `GET /api/stats` - Get financial statistics

## 🎨 Technologies

- **Backend**: Node.js, Express, SQLite3
- **Frontend**: React, CSS3
- **Database**: SQLite

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
