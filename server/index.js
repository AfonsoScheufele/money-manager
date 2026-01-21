const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
  // Accounts table
  db.run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Categories table
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT '💰',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Transactions table
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    category_id INTEGER,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )`);

  // Insert default categories
  const defaultCategories = [
    { name: 'Salário', type: 'income', color: '#10B981', icon: '💼' },
    { name: 'Freelance', type: 'income', color: '#10B981', icon: '💻' },
    { name: 'Investimentos', type: 'income', color: '#10B981', icon: '📈' },
    { name: 'Outros', type: 'income', color: '#10B981', icon: '💰' },
    { name: 'Alimentação', type: 'expense', color: '#EF4444', icon: '🍔' },
    { name: 'Transporte', type: 'expense', color: '#EF4444', icon: '🚗' },
    { name: 'Moradia', type: 'expense', color: '#EF4444', icon: '🏠' },
    { name: 'Saúde', type: 'expense', color: '#EF4444', icon: '🏥' },
    { name: 'Educação', type: 'expense', color: '#EF4444', icon: '📚' },
    { name: 'Lazer', type: 'expense', color: '#EF4444', icon: '🎮' },
    { name: 'Compras', type: 'expense', color: '#EF4444', icon: '🛒' },
    { name: 'Outros', type: 'expense', color: '#EF4444', icon: '💸' }
  ];

  db.get(`SELECT COUNT(*) as count FROM categories`, (err, row) => {
    if (!err && row && row.count === 0) {
      const stmt = db.prepare(`INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)`);
      defaultCategories.forEach(cat => {
        stmt.run(cat.name, cat.type, cat.color, cat.icon);
      });
      stmt.finalize();
    }
  });
});

// Routes - Accounts
app.get('/api/accounts', (req, res) => {
  db.all('SELECT * FROM accounts ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/accounts', (req, res) => {
  const { name, type, balance, color } = req.body;
  db.run(
    'INSERT INTO accounts (name, type, balance, color) VALUES (?, ?, ?, ?)',
    [name, type, balance || 0, color || '#3B82F6'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, type, balance: balance || 0, color: color || '#3B82F6' });
    }
  );
});

app.put('/api/accounts/:id', (req, res) => {
  const { name, type, balance, color } = req.body;
  db.run(
    'UPDATE accounts SET name = ?, type = ?, balance = ?, color = ? WHERE id = ?',
    [name, type, balance, color, req.params.id],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Account updated successfully' });
    }
  );
});

app.delete('/api/accounts/:id', (req, res) => {
  db.run('DELETE FROM accounts WHERE id = ?', [req.params.id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Also delete related transactions
    db.run('DELETE FROM transactions WHERE account_id = ?', [req.params.id]);
    res.json({ message: 'Account deleted successfully' });
  });
});

// Routes - Categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY type, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, type, color, icon } = req.body;
  db.run(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
    [name, type, color || '#6B7280', icon || '💰'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, type, color: color || '#6B7280', icon: icon || '💰' });
    }
  );
});

// Routes - Transactions
app.get('/api/transactions', (req, res) => {
  const query = `
    SELECT 
      t.*,
      a.name as account_name,
      a.color as account_color,
      c.name as category_name,
      c.color as category_color,
      c.icon as category_icon
    FROM transactions t
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.created_at DESC
  `;
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/transactions', (req, res) => {
  const { account_id, category_id, type, amount, description, date } = req.body;
  
  db.run(
    'INSERT INTO transactions (account_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)',
    [account_id, category_id, type, amount, description, date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Update account balance
      const balanceChange = type === 'income' ? amount : -amount;
      db.run(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [balanceChange, account_id]
      );
      
      res.json({ id: this.lastID, message: 'Transaction created successfully' });
    }
  );
});

app.delete('/api/transactions/:id', (req, res) => {
  // First get the transaction to reverse the balance
  db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, transaction) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (transaction) {
      // Reverse the balance change
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      db.run(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [balanceChange, transaction.account_id]
      );
    }
    
    // Delete the transaction
    db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Transaction deleted successfully' });
    });
  });
});

// Routes - Dashboard/Stats
app.get('/api/stats', (req, res) => {
  const stats = {};
  
  // Total balance
  db.get('SELECT SUM(balance) as total FROM accounts', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    stats.totalBalance = row.total || 0;
    
    // Income this month
    const currentMonth = new Date().toISOString().slice(0, 7);
    db.get(
      `SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND date LIKE ?`,
      [`${currentMonth}%`],
      (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        stats.monthlyIncome = row.total || 0;
        
        // Expenses this month
        db.get(
          `SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date LIKE ?`,
          [`${currentMonth}%`],
          (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            stats.monthlyExpenses = row.total || 0;
            stats.monthlyBalance = stats.monthlyIncome - stats.monthlyExpenses;
            
            res.json(stats);
          }
        );
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

