package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
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

type Investment struct {
	ID              int     `json:"id"`
	Ticker          string  `json:"ticker"`
	Name            string  `json:"name"`
	Type            string  `json:"type"`
	Quantity        float64 `json:"quantity"`
	AveragePrice    float64 `json:"average_price"`
	TotalInvested   float64 `json:"total_invested"`
	CurrentPrice    *float64 `json:"current_price"`
	CurrentValue    *float64 `json:"current_value"`
	ProfitLoss      *float64 `json:"profit_loss"`
	ProfitLossPercent *float64 `json:"profit_loss_percent"`
	Notes           *string `json:"notes"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       string  `json:"updated_at"`
}

var db *sql.DB

func initDB() {
	dbPath := filepath.Join(".", "database.sqlite")
	var err error
	
	db, err = sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)
	
	_, err = db.Exec("PRAGMA journal_mode=WAL")
	if err != nil {
		log.Printf("Warning: Could not enable WAL mode: %v", err)
	}
	
	_, err = db.Exec("PRAGMA busy_timeout=5000")
	if err != nil {
		log.Printf("Warning: Could not set busy timeout: %v", err)
	}
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
		`CREATE TABLE IF NOT EXISTS investments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ticker TEXT NOT NULL,
			name TEXT NOT NULL,
			type TEXT NOT NULL,
			quantity REAL NOT NULL,
			average_price REAL NOT NULL,
			total_invested REAL NOT NULL,
			current_price REAL,
			current_value REAL,
			profit_loss REAL,
			profit_loss_percent REAL,
			notes TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, table := range createTables {
		_, err = db.Exec(table)
		if err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}

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

	go checkAndProcessSalary()
	go autoUpdateInvestmentPrices()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3001", "http://localhost:3000"},
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

	r.GET("/api/categories", getCategories)
	r.POST("/api/categories", createCategory)

	r.GET("/api/transactions", getTransactions)
	r.POST("/api/transactions", createTransaction)
	r.PUT("/api/transactions/:id", updateTransaction)
	r.DELETE("/api/transactions/clear", clearAllTransactions)
	r.DELETE("/api/transactions/:id", deleteTransaction)
	
	r.GET("/api/salary", getSalaryConfig)
	r.POST("/api/salary", saveSalaryConfig)
	r.POST("/api/salary/process", processSalaryManually)

	r.GET("/api/stats", getStats)
	r.GET("/api/stats/period", getStatsByPeriod)
	r.GET("/api/stats/comparison", getMonthlyComparison)
	r.GET("/api/stats/top-expenses", getTopExpenses)
	r.GET("/api/stats/balance-history", getBalanceHistory)
	r.GET("/api/stats/expenses-by-category", getExpensesByCategory)
	r.GET("/api/investments", getInvestments)
	r.POST("/api/investments", createInvestment)
	r.PUT("/api/investments/:id", updateInvestment)
	r.DELETE("/api/investments/:id", deleteInvestment)
	r.GET("/api/investments/summary", getInvestmentsSummary)
	r.POST("/api/investments/:id/update-price", updateInvestmentPrice)
	r.POST("/api/investments/update-all-prices", updateAllInvestmentPrices)
	r.GET("/api/investments/fetch-price", fetchPriceForTicker)
	r.GET("/api/investments/search", searchInvestmentSuggestions)
	r.GET("/api/investments/analysis", getInvestmentAnalysis)
	r.GET("/api/investments/recommendations", getInvestmentRecommendations)

	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}

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

	_, err := db.Exec("DELETE FROM transactions WHERE account_id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	_, err = db.Exec("DELETE FROM accounts WHERE id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Account deleted successfully"})
}

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

// Investments handlers
func getInvestments(c *gin.Context) {
	rows, err := db.Query("SELECT * FROM investments ORDER BY created_at DESC")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var investments []Investment
	for rows.Next() {
		var inv Investment
		var currentPrice, currentValue, profitLoss, profitLossPercent sql.NullFloat64
		var notes sql.NullString
		
		err := rows.Scan(
			&inv.ID, &inv.Ticker, &inv.Name, &inv.Type, &inv.Quantity,
			&inv.AveragePrice, &inv.TotalInvested, &currentPrice, &currentValue,
			&profitLoss, &profitLossPercent, &notes, &inv.CreatedAt, &inv.UpdatedAt,
		)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		
		if currentPrice.Valid {
			inv.CurrentPrice = &currentPrice.Float64
		}
		if currentValue.Valid {
			inv.CurrentValue = &currentValue.Float64
		}
		if profitLoss.Valid {
			inv.ProfitLoss = &profitLoss.Float64
		}
		if profitLossPercent.Valid {
			inv.ProfitLossPercent = &profitLossPercent.Float64
		}
		if notes.Valid {
			inv.Notes = &notes.String
		}
		
		investments = append(investments, inv)
	}

	c.JSON(200, investments)
}

func createInvestment(c *gin.Context) {
	var inv Investment
	if err := c.ShouldBindJSON(&inv); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Calculate total invested
	inv.TotalInvested = inv.Quantity * inv.AveragePrice
	
	// Calculate current value and profit/loss if current price is provided
	var currentValue, profitLoss, profitLossPercent *float64
	if inv.CurrentPrice != nil {
		val := inv.Quantity * *inv.CurrentPrice
		currentValue = &val
		
		pl := val - inv.TotalInvested
		profitLoss = &pl
		
		percent := (pl / inv.TotalInvested) * 100
		profitLossPercent = &percent
	}

	result, err := db.Exec(
		`INSERT INTO investments (ticker, name, type, quantity, average_price, total_invested, 
		 current_price, current_value, profit_loss, profit_loss_percent, notes) 
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		inv.Ticker, inv.Name, inv.Type, inv.Quantity, inv.AveragePrice, inv.TotalInvested,
		inv.CurrentPrice, currentValue, profitLoss, profitLossPercent, inv.Notes,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	inv.ID = int(id)
	if currentValue != nil {
		inv.CurrentValue = currentValue
		inv.ProfitLoss = profitLoss
		inv.ProfitLossPercent = profitLossPercent
	}
	
	// Create transaction to deduct from account balance
	// Get or create "Investimento" category for expenses
	var categoryID int
	err = db.QueryRow("SELECT id FROM categories WHERE name = 'Investimento' AND type = 'expense'").Scan(&categoryID)
	if err == sql.ErrNoRows {
		// Create category if it doesn't exist
		catResult, err := db.Exec(
			"INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)",
			"Investimento", "expense", "#3B82F6", "📊",
		)
		if err != nil {
			log.Printf("Error creating Investimento category: %v", err)
		} else {
			catID, _ := catResult.LastInsertId()
			categoryID = int(catID)
		}
	} else if err != nil {
		log.Printf("Error finding Investimento category: %v", err)
	}
	
	// Get first account (Conta Principal)
	var accountID int
	err = db.QueryRow("SELECT id FROM accounts ORDER BY id LIMIT 1").Scan(&accountID)
	if err != nil {
		log.Printf("Error finding account: %v", err)
	} else {
		// Create transaction
		description := fmt.Sprintf("Investimento: %s (%s)", inv.Ticker, inv.Name)
		todayStr := time.Now().Format("2006-01-02")
		
		_, err = db.Exec(
			"INSERT INTO transactions (account_id, category_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?)",
			accountID, categoryID, "expense", inv.TotalInvested, description, todayStr,
		)
		if err != nil {
			log.Printf("Error creating investment transaction: %v", err)
		} else {
			// Update account balance (deduct expense)
			_, err = db.Exec(
				"UPDATE accounts SET balance = balance - ? WHERE id = ?",
				inv.TotalInvested, accountID,
			)
			if err != nil {
				log.Printf("Error updating account balance: %v", err)
			}
		}
	}
	
	c.JSON(200, inv)
}

func updateInvestment(c *gin.Context) {
	id := c.Param("id")
	var inv Investment
	if err := c.ShouldBindJSON(&inv); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Recalculate if quantity or average price changed
	var existingInv Investment
	err := db.QueryRow("SELECT quantity, average_price, total_invested FROM investments WHERE id = ?", id).Scan(
		&existingInv.Quantity, &existingInv.AveragePrice, &existingInv.TotalInvested,
	)
	
	if err != nil {
		c.JSON(404, gin.H{"error": "Investment not found"})
		return
	}

	// Update total invested if quantity or average price changed
	if inv.Quantity != existingInv.Quantity || inv.AveragePrice != existingInv.AveragePrice {
		inv.TotalInvested = inv.Quantity * inv.AveragePrice
	} else {
		inv.TotalInvested = existingInv.TotalInvested
	}
	
	// Calculate current value and profit/loss if current price is provided
	var currentValue, profitLoss, profitLossPercent *float64
	if inv.CurrentPrice != nil {
		val := inv.Quantity * *inv.CurrentPrice
		currentValue = &val
		
		pl := val - inv.TotalInvested
		profitLoss = &pl
		
		percent := (pl / inv.TotalInvested) * 100
		profitLossPercent = &percent
	}

	_, err = db.Exec(
		`UPDATE investments SET 
		 ticker = ?, name = ?, type = ?, quantity = ?, average_price = ?, total_invested = ?,
		 current_price = ?, current_value = ?, profit_loss = ?, profit_loss_percent = ?, notes = ?,
		 updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		inv.Ticker, inv.Name, inv.Type, inv.Quantity, inv.AveragePrice, inv.TotalInvested,
		inv.CurrentPrice, currentValue, profitLoss, profitLossPercent, inv.Notes, id,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Investment updated successfully"})
}

func deleteInvestment(c *gin.Context) {
	id := c.Param("id")
	
	// Get investment to find related transaction
	var totalInvested float64
	err := db.QueryRow("SELECT total_invested FROM investments WHERE id = ?", id).Scan(&totalInvested)
	if err != nil {
		c.JSON(404, gin.H{"error": "Investment not found"})
		return
	}
	
	// Delete investment
	_, err = db.Exec("DELETE FROM investments WHERE id = ?", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	// Find and delete related transaction (if exists)
	// Get first account
	var accountID int
	err = db.QueryRow("SELECT id FROM accounts ORDER BY id LIMIT 1").Scan(&accountID)
	if err == nil {
		// Find transaction with matching description and amount
		var transactionID int
		err = db.QueryRow(
			"SELECT id FROM transactions WHERE account_id = ? AND type = 'expense' AND amount = ? AND description LIKE 'Investimento:%' ORDER BY id DESC LIMIT 1",
			accountID, totalInvested,
		).Scan(&transactionID)
		
		if err == nil {
			// Reverse balance change
			_, err = db.Exec(
				"UPDATE accounts SET balance = balance + ? WHERE id = ?",
				totalInvested, accountID,
			)
			if err != nil {
				log.Printf("Error reversing account balance: %v", err)
			}
			
			// Delete transaction
			_, err = db.Exec("DELETE FROM transactions WHERE id = ?", transactionID)
			if err != nil {
				log.Printf("Error deleting investment transaction: %v", err)
			}
		}
	}
	
	c.JSON(200, gin.H{"message": "Investment deleted successfully"})
}

func getInvestmentsSummary(c *gin.Context) {
	var totalInvested, totalCurrentValue, totalProfitLoss float64
	var count int
	
	err := db.QueryRow(`
		SELECT 
			COUNT(*) as count,
			COALESCE(SUM(total_invested), 0) as total_invested,
			COALESCE(SUM(current_value), 0) as total_current_value,
			COALESCE(SUM(profit_loss), 0) as total_profit_loss
		FROM investments
	`).Scan(&count, &totalInvested, &totalCurrentValue, &totalProfitLoss)
	
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	totalProfitLossPercent := 0.0
	if totalInvested > 0 {
		totalProfitLossPercent = (totalProfitLoss / totalInvested) * 100
	}
	
	c.JSON(200, gin.H{
		"count": count,
		"total_invested": totalInvested,
		"total_current_value": totalCurrentValue,
		"total_profit_loss": totalProfitLoss,
		"total_profit_loss_percent": totalProfitLossPercent,
	})
}

// Get investment analysis and suggestions
func getInvestmentAnalysis(c *gin.Context) {
	rows, err := db.Query(`
		SELECT id, ticker, name, type, quantity, average_price, total_invested, 
		       current_price, current_value, profit_loss, profit_loss_percent
		FROM investments
		WHERE current_price IS NOT NULL
		ORDER BY total_invested DESC
	`)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var investments []Investment
	var totalInvested, totalCurrentValue float64
	typeDistribution := make(map[string]float64) // type -> total invested
	
	for rows.Next() {
		var inv Investment
		var currentPrice, currentValue, profitLoss, profitLossPercent sql.NullFloat64
		
		err := rows.Scan(
			&inv.ID, &inv.Ticker, &inv.Name, &inv.Type, &inv.Quantity,
			&inv.AveragePrice, &inv.TotalInvested, &currentPrice, &currentValue,
			&profitLoss, &profitLossPercent,
		)
		if err != nil {
			continue
		}
		
		if currentPrice.Valid {
			inv.CurrentPrice = &currentPrice.Float64
		}
		if currentValue.Valid {
			inv.CurrentValue = &currentValue.Float64
		}
		if profitLoss.Valid {
			inv.ProfitLoss = &profitLoss.Float64
		}
		if profitLossPercent.Valid {
			inv.ProfitLossPercent = &profitLossPercent.Float64
		}
		
		investments = append(investments, inv)
		totalInvested += inv.TotalInvested
		if inv.CurrentValue != nil {
			totalCurrentValue += *inv.CurrentValue
		}
		
		// Track type distribution
		typeDistribution[inv.Type] += inv.TotalInvested
	}
	
	if len(investments) == 0 {
		c.JSON(200, gin.H{
			"suggestions": []gin.H{},
			"warnings": []gin.H{},
			"diversification": gin.H{},
		})
		return
	}
	
	var suggestions []gin.H
	var warnings []gin.H
	
	// Analyze each investment
	for _, inv := range investments {
		if inv.ProfitLossPercent == nil {
			continue
		}
		
		profitPercent := *inv.ProfitLossPercent
		
		// SUGGEST SELL: High loss (>15%) - consider cutting losses
		if profitPercent < -15 {
			suggestions = append(suggestions, gin.H{
				"action": "vender",
				"ticker": inv.Ticker,
				"name": inv.Name,
				"reason": fmt.Sprintf("Perda significativa de %.1f%%. Considere realizar o prejuízo para evitar maiores perdas.", profitPercent),
				"priority": "alta",
				"profit_loss_percent": profitPercent,
				"current_value": inv.CurrentValue,
			})
		}
		
		// SUGGEST SELL: High profit (>30%) - consider taking profits
		if profitPercent > 30 {
			suggestions = append(suggestions, gin.H{
				"action": "vender_parcial",
				"ticker": inv.Ticker,
				"name": inv.Name,
				"reason": fmt.Sprintf("Ganho significativo de +%.1f%%. Considere realizar parte dos lucros para proteger ganhos.", profitPercent),
				"priority": "média",
				"profit_loss_percent": profitPercent,
				"current_value": inv.CurrentValue,
			})
		}
		
		// SUGGEST BUY: Good performance (5-20% gain) - consider adding more
		if profitPercent > 5 && profitPercent < 20 {
			suggestions = append(suggestions, gin.H{
				"action": "comprar",
				"ticker": inv.Ticker,
				"name": inv.Name,
				"reason": fmt.Sprintf("Performance positiva de +%.1f%%. Pode ser uma boa oportunidade para aumentar a posição.", profitPercent),
				"priority": "baixa",
				"profit_loss_percent": profitPercent,
				"current_value": inv.CurrentValue,
			})
		}
		
		// WARNING: Moderate loss (5-15%)
		if profitPercent < -5 && profitPercent >= -15 {
			warnings = append(warnings, gin.H{
				"ticker": inv.Ticker,
				"name": inv.Name,
				"message": fmt.Sprintf("Atenção: perda de %.1f%%. Monitore de perto.", profitPercent),
				"profit_loss_percent": profitPercent,
			})
		}
	}
	
	// Diversification analysis
	var diversificationWarnings []gin.H
	if totalInvested > 0 {
		for invType, amount := range typeDistribution {
			percentage := (amount / totalInvested) * 100
			// Warning if more than 50% in one type
			if percentage > 50 {
				diversificationWarnings = append(diversificationWarnings, gin.H{
					"type": invType,
					"percentage": percentage,
					"message": fmt.Sprintf("Carteira muito concentrada em %s (%.1f%%). Considere diversificar.", invType, percentage),
				})
			}
		}
	}
	
	// Overall portfolio health
	portfolioHealth := "boa"
	if totalInvested > 0 {
		totalProfitPercent := ((totalCurrentValue - totalInvested) / totalInvested) * 100
		if totalProfitPercent < -10 {
			portfolioHealth = "ruim"
		} else if totalProfitPercent < 0 {
			portfolioHealth = "atenção"
		}
	}
	
	c.JSON(200, gin.H{
		"suggestions": suggestions,
		"warnings": warnings,
		"diversification": gin.H{
			"distribution": typeDistribution,
			"warnings": diversificationWarnings,
		},
		"portfolio_health": portfolioHealth,
		"total_invested": totalInvested,
		"total_current_value": totalCurrentValue,
	})
}

// Get investment recommendations based on portfolio analysis
func getInvestmentRecommendations(c *gin.Context) {
	// Get current investments to analyze what's missing
	rows, err := db.Query(`
		SELECT ticker, type, total_invested
		FROM investments
	`)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	ownedTickers := make(map[string]bool)
	typeDistribution := make(map[string]float64)
	totalInvested := 0.0
	
	for rows.Next() {
		var ticker, invType string
		var invested float64
		rows.Scan(&ticker, &invType, &invested)
		ownedTickers[ticker] = true
		typeDistribution[invType] += invested
		totalInvested += invested
	}
	
	// Calculate percentages
	typePercentages := make(map[string]float64)
	if totalInvested > 0 {
		for invType, amount := range typeDistribution {
			typePercentages[invType] = (amount / totalInvested) * 100
		}
	}
	
	// Recommended investments with justifications
	recommendations := []gin.H{}
	
	// FII Recommendations (if user has less than 40% in FIIs or none)
	if typePercentages["FII"] < 40 || totalInvested == 0 {
		fiiRecommendations := []struct {
			ticker, name, reason string
		}{
			{
				"MXRF11",
				"Maxi Renda",
				"Um dos maiores FIIs do Brasil, alta liquidez e histórico consistente de dividendos. Ideal para começar ou diversificar em FIIs.",
			},
			{
				"HGLG11",
				"CSHG Logística",
				"Foco em galpões logísticos, setor em crescimento. Boa distribuição de dividendos e gestão sólida.",
			},
			{
				"XPLG11",
				"XP Log",
				"FII de logística com forte gestão da XP. Boa diversificação geográfica e histórico de valorização.",
			},
			{
				"KNRI11",
				"Kinea Rendimentos Imobiliários",
				"FII diversificado com foco em renda. Boa gestão e distribuição regular de proventos.",
			},
			{
				"VISC11",
				"Vinci Shopping Centers",
				"Exposição ao setor de shoppings, setor em recuperação. Potencial de valorização e dividendos.",
			},
		}
		
		for _, rec := range fiiRecommendations {
			if !ownedTickers[rec.ticker] {
				recommendations = append(recommendations, gin.H{
					"ticker": rec.ticker,
					"name": rec.name,
					"type": "FII",
					"reason": rec.reason,
					"priority": "alta",
					"category": "Diversificação em FIIs",
				})
			}
		}
	}
	
	// Stock Recommendations (if user has less than 30% in stocks or none)
	if typePercentages["Ação"] < 30 || totalInvested == 0 {
		stockRecommendations := []struct {
			ticker, name, reason string
		}{
			{
				"ITUB4",
				"Itaú Unibanco",
				"Maior banco privado do Brasil, alta liquidez e dividendos consistentes. Ação blue chip, ideal para carteira conservadora.",
			},
			{
				"PETR4",
				"Petrobras",
				"Maior empresa do Brasil, alta liquidez. Boa para diversificação e exposição ao setor de energia.",
			},
			{
				"VALE3",
				"Vale",
				"Líder mundial em mineração de ferro, alta liquidez e dividendos. Exposta ao ciclo de commodities.",
			},
			{
				"WEGE3",
				"WEG",
				"Empresa de tecnologia industrial, forte crescimento e boa gestão. Boa para crescimento de longo prazo.",
			},
			{
				"BBDC4",
				"Bradesco",
				"Um dos maiores bancos do Brasil, histórico sólido de dividendos. Boa para renda e crescimento.",
			},
		}
		
		for _, rec := range stockRecommendations {
			if !ownedTickers[rec.ticker] {
				recommendations = append(recommendations, gin.H{
					"ticker": rec.ticker,
					"name": rec.name,
					"type": "Ação",
					"reason": rec.reason,
					"priority": "alta",
					"category": "Diversificação em Ações",
				})
			}
		}
	}
	
	// ETF Recommendations (if user has less than 20% in ETFs or none)
	if typePercentages["ETF"] < 20 || totalInvested == 0 {
		etfRecommendations := []struct {
			ticker, name, reason string
		}{
			{
				"BOVA11",
				"iShares Ibovespa",
				"ETF que replica o Ibovespa, diversificação automática nas principais ações. Ideal para quem quer exposição ampla ao mercado.",
			},
			{
				"IVVB11",
				"iShares S&P 500",
				"Exposição ao mercado americano, diversificação internacional. Boa para reduzir risco geográfico.",
			},
			{
				"SMAL11",
				"iShares Small Cap",
				"ETF de pequenas empresas, maior potencial de crescimento. Boa para quem busca mais risco/retorno.",
			},
		}
		
		for _, rec := range etfRecommendations {
			if !ownedTickers[rec.ticker] {
				recommendations = append(recommendations, gin.H{
					"ticker": rec.ticker,
					"name": rec.name,
					"type": "ETF",
					"reason": rec.reason,
					"priority": "média",
					"category": "Diversificação com ETFs",
				})
			}
		}
	}
	
	// If portfolio is empty, add general recommendations
	if totalInvested == 0 {
		recommendations = append(recommendations, gin.H{
			"ticker": "MXRF11",
			"name": "Maxi Renda",
			"type": "FII",
			"reason": "Excelente para começar: um dos maiores e mais líquidos FIIs do Brasil, com histórico consistente de dividendos.",
			"priority": "alta",
			"category": "Primeiro Investimento",
		})
	}
	
	// Limit to top 10 recommendations
	if len(recommendations) > 10 {
		recommendations = recommendations[:10]
	}
	
	c.JSON(200, gin.H{
		"recommendations": recommendations,
		"portfolio_analysis": gin.H{
			"total_invested": totalInvested,
			"type_distribution": typePercentages,
			"owned_count": len(ownedTickers),
		},
	})
}

// Get quote with retry logic and fallback APIs
func getYahooFinanceQuote(ticker string) (float64, error) {
	// Try multiple APIs in order
	apis := []struct {
		name string
		fn   func(string) (float64, error)
	}{
		{"StatusInvest", tryStatusInvestQuote},
		{"Yahoo Finance", tryYahooFinanceQuote},
	}
	
	var lastErr error
	for _, api := range apis {
		price, err := api.fn(ticker)
		if err == nil {
			log.Printf("Successfully fetched %s price from %s", ticker, api.name)
			return price, nil
		}
		lastErr = err
		log.Printf("%s failed for %s: %v", api.name, ticker, err)
		// Small delay between API attempts
		time.Sleep(1 * time.Second)
	}
	
	return 0, fmt.Errorf("todas as APIs falharam: %v", lastErr)
}

// Try StatusInvest API (Brazilian, no auth needed)
func tryStatusInvestQuote(ticker string) (float64, error) {
	// StatusInvest public API endpoint
	url := fmt.Sprintf("https://statusinvest.com.br/home/mainsearchquery?q=%s", ticker)
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %v", err)
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://statusinvest.com.br/")
	
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch from StatusInvest: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("statusinvest returned status %d", resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read StatusInvest response: %v", err)
	}
	
	// StatusInvest returns array of results
	var results []map[string]interface{}
	if err := json.Unmarshal(body, &results); err != nil {
		return 0, fmt.Errorf("failed to parse StatusInvest JSON: %v", err)
	}
	
	if len(results) == 0 {
		return 0, fmt.Errorf("statusinvest: no results found")
	}
	
	// Find matching ticker (case insensitive)
	for _, result := range results {
		// Check both "ticker" and "code" fields
		resultTicker := ""
		if t, ok := result["ticker"].(string); ok {
			resultTicker = t
		} else if c, ok := result["code"].(string); ok {
			resultTicker = c
		}
		
		if strings.EqualFold(resultTicker, ticker) {
			// Try price field - StatusInvest returns price as string with comma
			if price, ok := result["price"].(float64); ok {
				return price, nil
			}
			if priceStr, ok := result["price"].(string); ok {
				// Convert Brazilian format (156,92) to float (156.92)
				priceStr = strings.Replace(priceStr, ",", ".", 1)
				price, err := strconv.ParseFloat(priceStr, 64)
				if err == nil {
					return price, nil
				}
			}
		}
	}
	
	return 0, fmt.Errorf("statusinvest: price not found for ticker %s", ticker)
}

// Try Yahoo Finance with retry
func tryYahooFinanceQuote(ticker string) (float64, error) {
	maxRetries := 2
	var lastErr error
	
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			time.Sleep(3 * time.Second)
		}
		
		price, err := tryGetQuote(ticker)
		if err == nil {
			return price, nil
		}
		
		lastErr = err
		// If it's not a rate limit error, don't retry
		if !strings.Contains(err.Error(), "429") && !strings.Contains(err.Error(), "rate limit") {
			return 0, err
		}
	}
	
	return 0, fmt.Errorf("yahoo finance: %v", lastErr)
}

// Try to get quote from Yahoo Finance
func tryGetQuote(ticker string) (float64, error) {
	// For Brazilian tickers, add .SA suffix
	yahooTicker := ticker
	if !strings.Contains(ticker, ".") {
		yahooTicker = ticker + ".SA"
	}
	
	// Use Yahoo Finance API v8 with different endpoint to avoid rate limiting
	url := fmt.Sprintf("https://query2.finance.yahoo.com/v8/finance/chart/%s?interval=1d&range=1d", yahooTicker)
	
	client := &http.Client{
		Timeout: 15 * time.Second,
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to create request: %v", err)
	}
	
	// Add headers to avoid rate limiting - rotate user agents
	userAgents := []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	}
	
	req.Header.Set("User-Agent", userAgents[time.Now().Unix()%int64(len(userAgents))])
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Referer", "https://finance.yahoo.com/")
	
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch quote: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == 429 {
		return 0, fmt.Errorf("rate limit exceeded")
	}
	
	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("yahoo finance returned status %d", resp.StatusCode)
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("failed to read response: %v", err)
	}
	
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, fmt.Errorf("failed to parse JSON: %v", err)
	}
	
	// Navigate through the JSON structure
	chart, ok := result["chart"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid response structure: chart not found")
	}
	
	resultArray, ok := chart["result"].([]interface{})
	if !ok || len(resultArray) == 0 {
		return 0, fmt.Errorf("invalid response structure: result array empty")
	}
	
	resultObj, ok := resultArray[0].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid response structure: result object not found")
	}
	
	meta, ok := resultObj["meta"].(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid response structure: meta not found")
	}
	
	regularPrice, ok := meta["regularMarketPrice"].(float64)
	if !ok {
		// Try previousClose as fallback
		if prevClose, ok := meta["previousClose"].(float64); ok {
			return prevClose, nil
		}
		return 0, fmt.Errorf("price not found in response")
	}
	
	return regularPrice, nil
}

// Update investment price from Yahoo Finance
func updateInvestmentPrice(c *gin.Context) {
	id := c.Param("id")
	
	// Get investment
	var inv Investment
	err := db.QueryRow("SELECT id, ticker, quantity, average_price, total_invested FROM investments WHERE id = ?", id).Scan(
		&inv.ID, &inv.Ticker, &inv.Quantity, &inv.AveragePrice, &inv.TotalInvested,
	)
	
	if err == sql.ErrNoRows {
		c.JSON(404, gin.H{"error": "Investment not found"})
		return
	}
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	// Fetch current price
	currentPrice, err := getYahooFinanceQuote(inv.Ticker)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to fetch quote: %v", err)})
		return
	}
	
	// Calculate values
	currentValue := inv.Quantity * currentPrice
	profitLoss := currentValue - inv.TotalInvested
	profitLossPercent := (profitLoss / inv.TotalInvested) * 100
	
	// Update database
	_, err = db.Exec(
		`UPDATE investments SET 
		 current_price = ?, current_value = ?, profit_loss = ?, profit_loss_percent = ?,
		 updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		currentPrice, currentValue, profitLoss, profitLossPercent, id,
	)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(200, gin.H{
		"message": "Price updated successfully",
		"current_price": currentPrice,
		"current_value": currentValue,
		"profit_loss": profitLoss,
		"profit_loss_percent": profitLossPercent,
	})
}

// Update all investment prices
func updateAllInvestmentPrices(c *gin.Context) {
	rows, err := db.Query("SELECT id, ticker, quantity, average_price, total_invested FROM investments")
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	
	updated := 0
	failed := 0
	errors := []string{}
	
	for rows.Next() {
		var inv Investment
		err := rows.Scan(&inv.ID, &inv.Ticker, &inv.Quantity, &inv.AveragePrice, &inv.TotalInvested)
		if err != nil {
			failed++
			errors = append(errors, fmt.Sprintf("Erro ao ler investimento: %v", err))
			continue
		}
		
		// Skip if total_invested is 0 (invalid investment)
		if inv.TotalInvested == 0 {
			log.Printf("Skipping investment %s: total_invested is 0", inv.Ticker)
			continue
		}
		
		// Fetch current price with retry
		var currentPrice float64
		var priceErr error
		maxRetries := 2
		for retry := 0; retry < maxRetries; retry++ {
			currentPrice, priceErr = getYahooFinanceQuote(inv.Ticker)
			if priceErr == nil {
				break
			}
			if retry < maxRetries-1 {
				log.Printf("Retry %d for %s: %v", retry+1, inv.Ticker, priceErr)
				time.Sleep(2 * time.Second) // Wait before retry
			}
		}
		
		if priceErr != nil {
			failed++
			errorMsg := fmt.Sprintf("%s: %v", inv.Ticker, priceErr)
			errors = append(errors, errorMsg)
			log.Printf("Failed to update %s: %v", inv.Ticker, priceErr)
			continue
		}
		
		// Validate price
		if currentPrice <= 0 {
			failed++
			errorMsg := fmt.Sprintf("%s: preço inválido (%.2f)", inv.Ticker, currentPrice)
			errors = append(errors, errorMsg)
			log.Printf("Invalid price for %s: %.2f", inv.Ticker, currentPrice)
			continue
		}
		
		// Calculate values
		currentValue := inv.Quantity * currentPrice
		profitLoss := currentValue - inv.TotalInvested
		profitLossPercent := 0.0
		if inv.TotalInvested > 0 {
			profitLossPercent = (profitLoss / inv.TotalInvested) * 100
		}
		
		// Update database with retry for "database is locked" errors
		var updateErr error
		maxDBRetries := 3
		for dbRetry := 0; dbRetry < maxDBRetries; dbRetry++ {
			_, updateErr = db.Exec(
				`UPDATE investments SET 
				 current_price = ?, current_value = ?, profit_loss = ?, profit_loss_percent = ?,
				 updated_at = CURRENT_TIMESTAMP
				 WHERE id = ?`,
				currentPrice, currentValue, profitLoss, profitLossPercent, inv.ID,
			)
			if updateErr == nil {
				break
			}
			
			// Check if it's a "database is locked" error
			if strings.Contains(updateErr.Error(), "database is locked") || strings.Contains(updateErr.Error(), "locked") {
				if dbRetry < maxDBRetries-1 {
					waitTime := time.Duration(dbRetry+1) * 200 * time.Millisecond
					log.Printf("Database locked for %s, retrying in %v (attempt %d/%d)", inv.Ticker, waitTime, dbRetry+1, maxDBRetries)
					time.Sleep(waitTime)
					continue
				}
			} else {
				// Not a locking error, don't retry
				break
			}
		}
		
		if updateErr != nil {
			failed++
			errorMsg := fmt.Sprintf("%s: erro ao salvar no banco: %v", inv.Ticker, updateErr)
			errors = append(errors, errorMsg)
			log.Printf("Database error for %s: %v", inv.Ticker, updateErr)
			continue
		}
		
		updated++
		log.Printf("Successfully updated %s: R$ %.2f", inv.Ticker, currentPrice)
		
		// Small delay to avoid rate limiting
		time.Sleep(1 * time.Second)
	}
	
	c.JSON(200, gin.H{
		"message": "Update completed",
		"updated": updated,
		"failed": failed,
		"errors": errors,
	})
}

// Fetch price for a ticker (used when adding new investment)
func fetchPriceForTicker(c *gin.Context) {
	ticker := c.Query("ticker")
	if ticker == "" {
		c.JSON(400, gin.H{"error": "Ticker parameter is required"})
		return
	}
	
	// Add a small delay to avoid rate limiting
	time.Sleep(2 * time.Second)
	
	price, err := getYahooFinanceQuote(ticker)
	if err != nil {
		// Check if it's a rate limit error
		if strings.Contains(err.Error(), "rate limit") || strings.Contains(err.Error(), "429") {
			c.JSON(429, gin.H{
				"error": "Muitas requisições ao Yahoo Finance. Aguarde alguns minutos e tente novamente, ou preencha o preço médio manualmente.",
				"ticker": ticker,
				"retry_after": 60, // seconds
			})
			return
		}
		
		// For other errors, return 200 but with error info (don't block user)
		c.JSON(200, gin.H{
			"ticker": ticker,
			"error": fmt.Sprintf("Não foi possível buscar o preço: %v. Por favor, preencha o preço médio manualmente.", err),
			"price": nil,
		})
		return
	}
	
	c.JSON(200, gin.H{"ticker": ticker, "price": price})
}

// Search investment suggestions from StatusInvest
func searchInvestmentSuggestions(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(400, gin.H{"error": "Query parameter 'q' is required"})
		return
	}
	
	// StatusInvest public API endpoint
	url := fmt.Sprintf("https://statusinvest.com.br/home/mainsearchquery?q=%s", query)
	
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to create request: %v", err)})
		return
	}
	
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://statusinvest.com.br/")
	
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to fetch suggestions: %v", err)})
		return
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("StatusInvest returned status %d", resp.StatusCode)})
		return
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to read response: %v", err)})
		return
	}
	
	// StatusInvest returns array of results
	var results []map[string]interface{}
	if err := json.Unmarshal(body, &results); err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Failed to parse JSON: %v", err)})
		return
	}
	
	// Format results for frontend
	suggestions := []map[string]interface{}{}
	for _, result := range results {
		ticker := ""
		if t, ok := result["code"].(string); ok {
			ticker = t
		} else if t, ok := result["normalizedName"].(string); ok {
			ticker = t
		} else if t, ok := result["ticker"].(string); ok {
			ticker = t
		}
		
		if ticker == "" {
			continue
		}
		
		name := ""
		if n, ok := result["nameFormated"].(string); ok {
			name = n
		} else if n, ok := result["name"].(string); ok {
			name = n
		}
		
		invType := "Outro"
		if t, ok := result["type"].(float64); ok {
			if t == 2 {
				invType = "FII"
			} else if t == 1 {
				invType = "Ação"
			}
		}
		
		suggestions = append(suggestions, map[string]interface{}{
			"ticker": ticker,
			"name":   name,
			"type":   invType,
		})
	}
	
	c.JSON(200, suggestions)
}

// Auto-update investment prices periodically
func autoUpdateInvestmentPrices() {
	ticker := time.NewTicker(2 * time.Minute) // Update every 2 minutes for real-time updates
	defer ticker.Stop()
	
	for range ticker.C {
		rows, err := db.Query("SELECT id, ticker, quantity, average_price, total_invested FROM investments")
		if err != nil {
			log.Printf("Error fetching investments for auto-update: %v", err)
			continue
		}
		defer rows.Close()
		
		for rows.Next() {
			var inv Investment
			err := rows.Scan(&inv.ID, &inv.Ticker, &inv.Quantity, &inv.AveragePrice, &inv.TotalInvested)
			if err != nil {
				continue
			}
			
			// Fetch current price
			currentPrice, err := getYahooFinanceQuote(inv.Ticker)
			if err != nil {
				log.Printf("Error fetching quote for %s: %v", inv.Ticker, err)
				continue
			}
			
			// Calculate values
			currentValue := inv.Quantity * currentPrice
			profitLoss := currentValue - inv.TotalInvested
			profitLossPercent := (profitLoss / inv.TotalInvested) * 100
			
			// Update database
			_, err = db.Exec(
				`UPDATE investments SET 
				 current_price = ?, current_value = ?, profit_loss = ?, profit_loss_percent = ?,
				 updated_at = CURRENT_TIMESTAMP
				 WHERE id = ?`,
				currentPrice, currentValue, profitLoss, profitLossPercent, inv.ID,
			)
			if err != nil {
				log.Printf("Error updating investment %s: %v", inv.Ticker, err)
				continue
			}
			
			// Small delay to avoid rate limiting
			time.Sleep(500 * time.Millisecond)
		}
		
		log.Println("Investment prices auto-updated")
	}
}

