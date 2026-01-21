package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

type Account struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	Type      string  `json:"type"`
	Balance   float64 `json:"balance"`
	Color     string  `json:"color"`
	CreatedAt string  `json:"created_at"`
}

type Category struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Type      string `json:"type"`
	Color     string `json:"color"`
	Icon      string `json:"icon"`
	CreatedAt string `json:"created_at"`
}

type Transaction struct {
	ID            int     `json:"id"`
	AccountID     int     `json:"account_id"`
	CategoryID    *int    `json:"category_id"`
	Type          string  `json:"type"`
	Amount        float64 `json:"amount"`
	Description   *string `json:"description"`
	Date          string  `json:"date"`
	CreatedAt     string  `json:"created_at"`
	AccountName   *string `json:"account_name"`
	AccountColor  *string `json:"account_color"`
	CategoryName  *string `json:"category_name"`
	CategoryColor *string `json:"category_color"`
	CategoryIcon  *string `json:"category_icon"`
}

type Stats struct {
	TotalBalance    float64 `json:"totalBalance"`
	MonthlyIncome   float64 `json:"monthlyIncome"`
	MonthlyExpenses float64 `json:"monthlyExpenses"`
	MonthlyBalance  float64 `json:"monthlyBalance"`
}

var db *sql.DB

func initDB() {
	dbPath := filepath.Join(".", "database.sqlite")
	var err error
	db, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	// Create tables
	createTables := []string{
		`CREATE TABLE IF NOT EXISTS accounts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			balance REAL DEFAULT 0,
			color TEXT DEFAULT '#3B82F6',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			type TEXT NOT NULL,
			color TEXT DEFAULT '#6B7280',
			icon TEXT DEFAULT '💰',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS transactions (
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
		)`,
		`CREATE TABLE IF NOT EXISTS salary_config (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			amount REAL NOT NULL,
			account_id INTEGER NOT NULL,
			category_id INTEGER,
			last_paid_month TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (account_id) REFERENCES accounts(id),
			FOREIGN KEY (category_id) REFERENCES categories(id)
		)`,
	}

	for _, table := range createTables {
		_, err = db.Exec(table)
		if err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}

	// Insert default categories
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM categories").Scan(&count)
	if err != nil {
		log.Fatal("Failed to count categories:", err)
	}

	if count == 0 {
		defaultCategories := []struct {
			name, categoryType, color, icon string
		}{
			{"Salário", "income", "#10B981", "💼"},
			{"Freelance", "income", "#10B981", "💻"},
			{"Investimentos", "income", "#10B981", "📈"},
			{"Presentes", "income", "#10B981", "🎁"},
			{"Outros", "income", "#10B981", "💰"},
			{"Alimentação", "expense", "#EF4444", "🍔"},
			{"Transporte", "expense", "#EF4444", "🚗"},
			{"Moradia", "expense", "#EF4444", "🏠"},
			{"Saúde", "expense", "#EF4444", "🏥"},
			{"Educação", "expense", "#EF4444", "📚"},
			{"Lazer", "expense", "#EF4444", "🎮"},
			{"Vestuário", "expense", "#EF4444", "👕"},
			{"Contas", "expense", "#EF4444", "💳"},
			{"Outros", "expense", "#EF4444", "💸"},
		}

		stmt, err := db.Prepare("INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)")
		if err != nil {
			log.Fatal("Failed to prepare statement:", err)
		}
		defer stmt.Close()

		for _, cat := range defaultCategories {
			_, err = stmt.Exec(cat.name, cat.categoryType, cat.color, cat.icon)
			if err != nil {
				log.Printf("Failed to insert category %s: %v", cat.name, err)
			}
		}
	}
}

func main() {
	initDB()
	defer db.Close()

	// Check and process salary on startup and periodically
	go checkAndProcessSalary()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes - Accounts
	r.GET("/api/accounts", getAccounts)
	r.POST("/api/accounts", createAccount)
	r.PUT("/api/accounts/:id", updateAccount)
	r.DELETE("/api/accounts/:id", deleteAccount)

	// Routes - Categories
	r.GET("/api/categories", getCategories)
	r.POST("/api/categories", createCategory)

	// Routes - Transactions
	r.GET("/api/transactions", getTransactions)
	r.POST("/api/transactions", createTransaction)
	r.PUT("/api/transactions/:id", updateTransaction)
	r.DELETE("/api/transactions/clear", clearAllTransactions)
	r.DELETE("/api/transactions/:id", deleteTransaction)
	
	// Routes - Salary
	r.GET("/api/salary", getSalaryConfig)
	r.POST("/api/salary", saveSalaryConfig)
	r.POST("/api/salary/process", processSalaryManually)

	// Routes - Stats
	r.GET("/api/stats", getStats)
	r.GET("/api/stats/period", getStatsByPeriod)
	r.GET("/api/stats/comparison", getMonthlyComparison)
	r.GET("/api/stats/top-expenses", getTopExpenses)
	r.GET("/api/stats/balance-history", getBalanceHistory)
	r.GET("/api/stats/expenses-by-category", getExpensesByCategory)

	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}

// Accounts handlers
func getAccounts(c *gin.Context) {
	rows, err := db.Query("SELECT * FROM accounts ORDER BY created_at DESC")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var acc Account
		err := rows.Scan(&acc.ID, &acc.Name, &acc.Type, &acc.Balance, &acc.Color, &acc.CreatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		accounts = append(accounts, acc)
	}

	c.JSON(200, accounts)
}

func createAccount(c *gin.Context) {
	var acc Account
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if acc.Balance == 0 {
		acc.Balance = 0
	}
	if acc.Color == "" {
		acc.Color = "#3B82F6"
	}

	result, err := db.Exec(
		"INSERT INTO accounts (name, type, balance, color) VALUES (?, ?, ?, ?)",
		acc.Name, acc.Type, acc.Balance, acc.Color,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	acc.ID = int(id)
	c.JSON(200, acc)
}

func updateAccount(c *gin.Context) {
	id := c.Param("id")
	var acc Account
	if err := c.ShouldBindJSON(&acc); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Exec(
		"UPDATE accounts SET name = ?, type = ?, balance = ?, color = ? WHERE id = ?",
		acc.Name, acc.Type, acc.Balance, acc.Color, id,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Account updated successfully"})
}

func deleteAccount(c *gin.Context) {
	id := c.Param("id")

	// Delete related transactions
	_, err := db.Exec("DELETE FROM transactions WHERE account_id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Delete account
	_, err = db.Exec("DELETE FROM accounts WHERE id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Account deleted successfully"})
}

// Categories handlers
func getCategories(c *gin.Context) {
	rows, err := db.Query("SELECT * FROM categories ORDER BY type, name")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var categories []Category
	for rows.Next() {
		var cat Category
		err := rows.Scan(&cat.ID, &cat.Name, &cat.Type, &cat.Color, &cat.Icon, &cat.CreatedAt)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		categories = append(categories, cat)
	}

	c.JSON(200, categories)
}

func createCategory(c *gin.Context) {
	var cat Category
	if err := c.ShouldBindJSON(&cat); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if cat.Color == "" {
		cat.Color = "#6B7280"
	}
	if cat.Icon == "" {
		cat.Icon = "💰"
	}

	result, err := db.Exec(
		"INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)",
		cat.Name, cat.Type, cat.Color, cat.Icon,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	cat.ID = int(id)
	c.JSON(200, cat)
}

// Transactions handlers
func getTransactions(c *gin.Context) {
	query := `
		SELECT 
			t.id, t.account_id, t.category_id, t.type, t.amount, t.description, t.date, t.created_at,
			a.name as account_name, a.color as account_color,
			c.name as category_name, c.color as category_color, c.icon as category_icon
		FROM transactions t
		LEFT JOIN accounts a ON t.account_id = a.id
		LEFT JOIN categories c ON t.category_id = c.id
		ORDER BY t.date DESC, t.created_at DESC
	`

	rows, err := db.Query(query)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var transactions []Transaction
	for rows.Next() {
		var t Transaction
		err := rows.Scan(
			&t.ID, &t.AccountID, &t.CategoryID, &t.Type, &t.Amount, &t.Description, &t.Date, &t.CreatedAt,
			&t.AccountName, &t.AccountColor,
			&t.CategoryName, &t.CategoryColor, &t.CategoryIcon,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		transactions = append(transactions, t)
	}

	c.JSON(200, transactions)
}

func createTransaction(c *gin.Context) {
	var t Transaction
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	result, err := db.Exec(
		"INSERT INTO transactions (account_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)",
		t.AccountID, t.CategoryID, t.Type, t.Amount, t.Description, t.Date,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()

	// Update account balance
	var balanceChange float64
	if t.Type == "income" {
		balanceChange = t.Amount
	} else {
		balanceChange = -t.Amount
	}

	_, err = db.Exec(
		"UPDATE accounts SET balance = balance + ? WHERE id = ?",
		balanceChange, t.AccountID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"id": id, "message": "Transaction created successfully"})
}

func deleteTransaction(c *gin.Context) {
	id := c.Param("id")

	// Get transaction to reverse balance
	var tID, accountID int
	var transactionType string
	var amount float64
	err := db.QueryRow("SELECT id, account_id, type, amount FROM transactions WHERE id = ?", id).Scan(
		&tID, &accountID, &transactionType, &amount,
	)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if err == nil {
		// Reverse balance change
		var balanceChange float64
		if transactionType == "income" {
			balanceChange = -amount
		} else {
			balanceChange = amount
		}

		_, err = db.Exec(
			"UPDATE accounts SET balance = balance + ? WHERE id = ?",
			balanceChange, accountID,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	// Delete transaction
	_, err = db.Exec("DELETE FROM transactions WHERE id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Transaction deleted successfully"})
}

// Stats handler
func getStats(c *gin.Context) {
	var stats Stats

	// Total balance
	err := db.QueryRow("SELECT SUM(balance) FROM accounts").Scan(&stats.TotalBalance)
	if err != nil {
		stats.TotalBalance = 0
	}

	// Current month
	currentMonth := time.Now().Format("2006-01")

	// Monthly income
	err = db.QueryRow(
		"SELECT SUM(amount) FROM transactions WHERE type = 'income' AND date LIKE ?",
		currentMonth+"%",
	).Scan(&stats.MonthlyIncome)
	if err != nil {
		stats.MonthlyIncome = 0
	}

	// Monthly expenses
	err = db.QueryRow(
		"SELECT SUM(amount) FROM transactions WHERE type = 'expense' AND date LIKE ?",
		currentMonth+"%",
	).Scan(&stats.MonthlyExpenses)
	if err != nil {
		stats.MonthlyExpenses = 0
	}

	stats.MonthlyBalance = stats.MonthlyIncome - stats.MonthlyExpenses

	c.JSON(200, stats)
}

// Update transaction handler
func updateTransaction(c *gin.Context) {
	id := c.Param("id")

	// Get old transaction to reverse balance
	var oldTID, oldAccountID int
	var oldType string
	var oldAmount float64
	err := db.QueryRow("SELECT id, account_id, type, amount FROM transactions WHERE id = ?", id).Scan(
		&oldTID, &oldAccountID, &oldType, &oldAmount,
	)
	if err != nil {
		c.JSON(404, gin.H{"error": "Transaction not found"})
		return
	}

	// Reverse old balance
	var oldBalanceChange float64
	if oldType == "income" {
		oldBalanceChange = -oldAmount
	} else {
		oldBalanceChange = oldAmount
	}
	db.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", oldBalanceChange, oldAccountID)

	// Get new transaction data
	var t Transaction
	if err := c.ShouldBindJSON(&t); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Update transaction
	_, err = db.Exec(
		"UPDATE transactions SET account_id = ?, category_id = ?, type = ?, amount = ?, description = ?, date = ? WHERE id = ?",
		t.AccountID, t.CategoryID, t.Type, t.Amount, t.Description, t.Date, id,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Apply new balance change
	var newBalanceChange float64
	if t.Type == "income" {
		newBalanceChange = t.Amount
	} else {
		newBalanceChange = -t.Amount
	}

	_, err = db.Exec(
		"UPDATE accounts SET balance = balance + ? WHERE id = ?",
		newBalanceChange, t.AccountID,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Transaction updated successfully"})
}

// Get stats by period
func getStatsByPeriod(c *gin.Context) {
	startDate := c.Query("start")
	endDate := c.Query("end")

	var income, expenses float64
	db.QueryRow(
		"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?",
		startDate, endDate,
	).Scan(&income)

	db.QueryRow(
		"SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?",
		startDate, endDate,
	).Scan(&expenses)

	c.JSON(200, gin.H{
		"income":   income,
		"expenses": expenses,
		"balance":  income - expenses,
	})
}

// Get monthly comparison
func getMonthlyComparison(c *gin.Context) {
	now := time.Now()
	currentMonth := now.Format("2006-01")
	lastMonth := now.AddDate(0, -1, 0).Format("2006-01")

	var currentIncome, currentExpenses, lastIncome, lastExpenses float64

	db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income' AND date LIKE ?", currentMonth+"%").Scan(&currentIncome)
	db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date LIKE ?", currentMonth+"%").Scan(&currentExpenses)
	db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'income' AND date LIKE ?", lastMonth+"%").Scan(&lastIncome)
	db.QueryRow("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'expense' AND date LIKE ?", lastMonth+"%").Scan(&lastExpenses)

	c.JSON(200, gin.H{
		"current": gin.H{
			"income":   currentIncome,
			"expenses": currentExpenses,
			"balance":  currentIncome - currentExpenses,
		},
		"previous": gin.H{
			"income":   lastIncome,
			"expenses": lastExpenses,
			"balance":  lastIncome - lastExpenses,
		},
	})
}

// Get top expenses
func getTopExpenses(c *gin.Context) {
	limit := c.DefaultQuery("limit", "10")
	rows, err := db.Query(`
		SELECT t.amount, t.description, t.date, c.name as category_name, c.icon as category_icon
		FROM transactions t
		LEFT JOIN categories c ON t.category_id = c.id
		WHERE t.type = 'expense'
		ORDER BY t.amount DESC
		LIMIT ?
	`, limit)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var expenses []gin.H
	for rows.Next() {
		var amount float64
		var description, date, categoryName, categoryIcon sql.NullString
		rows.Scan(&amount, &description, &date, &categoryName, &categoryIcon)
		expenses = append(expenses, gin.H{
			"amount":        amount,
			"description":   description.String,
			"date":          date.String,
			"category_name": categoryName.String,
			"category_icon": categoryIcon.String,
		})
	}

	c.JSON(200, expenses)
}

// Get balance history
func getBalanceHistory(c *gin.Context) {
	months := c.DefaultQuery("months", "6")
	rows, err := db.Query(`
		SELECT 
			strftime('%Y-%m', date) as month,
			SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
			SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
		FROM transactions
		WHERE date >= date('now', '-' || ? || ' months')
		GROUP BY month
		ORDER BY month
	`, months)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var history []gin.H
	for rows.Next() {
		var month string
		var income, expenses float64
		rows.Scan(&month, &income, &expenses)
		history = append(history, gin.H{
			"month":    month,
			"income":   income,
			"expenses": expenses,
			"balance":  income - expenses,
		})
	}

	c.JSON(200, history)
}

// Get expenses by category
func getExpensesByCategory(c *gin.Context) {
	startDate := c.DefaultQuery("start", "")
	endDate := c.DefaultQuery("end", "")

	query := `
		SELECT c.name, c.icon, c.color, SUM(t.amount) as total
		FROM transactions t
		JOIN categories c ON t.category_id = c.id
		WHERE t.type = 'expense'
	`
	args := []interface{}{}

	if startDate != "" && endDate != "" {
		query += " AND t.date >= ? AND t.date <= ?"
		args = append(args, startDate, endDate)
	}

	query += " GROUP BY c.id, c.name, c.icon, c.color ORDER BY total DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var categories []gin.H
	for rows.Next() {
		var name, icon, color string
		var total float64
		rows.Scan(&name, &icon, &color, &total)
		categories = append(categories, gin.H{
			"name":  name,
			"icon":  icon,
			"color": color,
			"total": total,
		})
	}

	c.JSON(200, categories)
}

// Clear all transactions
func clearAllTransactions(c *gin.Context) {
	// Get all transactions to reverse balances
	rows, err := db.Query("SELECT account_id, type, amount FROM transactions")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	// Reverse all balance changes
	for rows.Next() {
		var accountID int
		var transactionType string
		var amount float64
		rows.Scan(&accountID, &transactionType, &amount)

		var balanceChange float64
		if transactionType == "income" {
			balanceChange = -amount
		} else {
			balanceChange = amount
		}

		db.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", balanceChange, accountID)
	}

	// Delete all transactions
	_, err = db.Exec("DELETE FROM transactions")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "All transactions deleted successfully"})
}

// Salary configuration
type SalaryConfig struct {
	ID           int     `json:"id"`
	Amount       float64 `json:"amount"`
	AccountID    int     `json:"account_id"`
	CategoryID   *int    `json:"category_id"`
	LastPaidMonth string `json:"last_paid_month"`
}

// Get first business day of month
func getFirstBusinessDay(year int, month time.Month) time.Time {
	firstDay := time.Date(year, month, 1, 0, 0, 0, 0, time.Local)
	
	// If Saturday (6), move to Monday
	if firstDay.Weekday() == time.Saturday {
		firstDay = firstDay.AddDate(0, 0, 2)
	}
	// If Sunday (0), move to Monday
	if firstDay.Weekday() == time.Sunday {
		firstDay = firstDay.AddDate(0, 0, 1)
	}
	
	return firstDay
}

// Check and process salary
func checkAndProcessSalary() {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	
	for range ticker.C {
		now := time.Now()
		currentMonth := now.Format("2006-01")
		
		// Get salary config
		var config SalaryConfig
		var lastPaidMonth sql.NullString
		err := db.QueryRow("SELECT id, amount, account_id, category_id, last_paid_month FROM salary_config LIMIT 1").Scan(
			&config.ID, &config.Amount, &config.AccountID, &config.CategoryID, &lastPaidMonth,
		)
		
		if err == sql.ErrNoRows {
			// No salary config, skip
			continue
		}
		
		if err != nil {
			log.Printf("Error checking salary config: %v", err)
			continue
		}
		
		config.LastPaidMonth = lastPaidMonth.String
		
		// Check if already paid this month
		if config.LastPaidMonth == currentMonth {
			continue
		}
		
		// Check if today is the first business day or after
		firstBusinessDay := getFirstBusinessDay(now.Year(), now.Month())
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.Local)
		
		if today.Equal(firstBusinessDay) || today.After(firstBusinessDay) {
			// Process salary
			todayStr := now.Format("2006-01-02")
			
			// Create transaction
			_, err = db.Exec(
				"INSERT INTO transactions (account_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)",
				config.AccountID, config.CategoryID, "income", config.Amount, "Salário mensal", todayStr,
			)
			
			if err != nil {
				log.Printf("Error creating salary transaction: %v", err)
			} else {
				// Update account balance
				db.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", config.Amount, config.AccountID)
				
				// Update last paid month
				db.Exec("UPDATE salary_config SET last_paid_month = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", currentMonth, config.ID)
				
				log.Printf("Salary of %.2f processed for account %d", config.Amount, config.AccountID)
			}
		}
	}
}

// Get salary config
func getSalaryConfig(c *gin.Context) {
	var config SalaryConfig
	var lastPaidMonth sql.NullString
	err := db.QueryRow("SELECT id, amount, account_id, category_id, last_paid_month FROM salary_config LIMIT 1").Scan(
		&config.ID, &config.Amount, &config.AccountID, &config.CategoryID, &lastPaidMonth,
	)
	
	if err == sql.ErrNoRows {
		c.JSON(200, gin.H{"exists": false})
		return
	}
	
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	config.LastPaidMonth = lastPaidMonth.String
	c.JSON(200, gin.H{"exists": true, "config": config})
}

// Create or update salary config
func saveSalaryConfig(c *gin.Context) {
	var config SalaryConfig
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	
	// Check if config exists
	var exists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM salary_config)").Scan(&exists)
	
	if exists {
		// Get current ID first
		var currentID int
		err := db.QueryRow("SELECT id FROM salary_config LIMIT 1").Scan(&currentID)
		if err != nil {
			c.JSON(500, gin.H{"error": "Error finding salary config: " + err.Error()})
			return
		}
		
		// Update
		_, err = db.Exec(
			"UPDATE salary_config SET amount = ?, account_id = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
			config.Amount, config.AccountID, config.CategoryID, currentID,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		
		// Return updated config
		config.ID = currentID
		c.JSON(200, gin.H{"message": "Salary config updated successfully", "config": config})
	} else {
		// Create
		result, err := db.Exec(
			"INSERT INTO salary_config (amount, account_id, category_id) VALUES (?, ?, ?)",
			config.Amount, config.AccountID, config.CategoryID,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		id, _ := result.LastInsertId()
		config.ID = int(id)
		c.JSON(200, gin.H{"message": "Salary config created successfully", "id": config.ID})
	}
}

// Process salary manually
func processSalaryManually(c *gin.Context) {
	var config SalaryConfig
	err := db.QueryRow("SELECT id, amount, account_id, category_id FROM salary_config LIMIT 1").Scan(
		&config.ID, &config.Amount, &config.AccountID, &config.CategoryID,
	)
	
	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "Salary config not found"})
		return
	}
	
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	now := time.Now()
	todayStr := now.Format("2006-01-02")
	currentMonth := now.Format("2006-01")
	
	// Create transaction
	result, err := db.Exec(
		"INSERT INTO transactions (account_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)",
		config.AccountID, config.CategoryID, "income", config.Amount, "Salário mensal", todayStr,
	)
	
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	// Update account balance
	db.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", config.Amount, config.AccountID)
	
	// Update last paid month
	db.Exec("UPDATE salary_config SET last_paid_month = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", currentMonth, config.ID)
	
	id, _ := result.LastInsertId()
	c.JSON(200, gin.H{"id": id, "message": "Salary processed successfully"})
}

