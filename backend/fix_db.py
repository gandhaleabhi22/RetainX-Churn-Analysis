import sqlite3

conn = sqlite3.connect('churn_analysis.db')
cursor = conn.cursor()

cursor.execute("DROP TABLE IF EXISTS customers")
cursor.execute("DROP TABLE IF EXISTS predictions")

cursor.execute('''
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Timestamp TEXT,
    age_group TEXT,
    platforms TEXT,
    primary_platform TEXT,
    subscription_duration TEXT,
    subscription_plan TEXT,
    monthly_spend TEXT,
    usage_frequency TEXT,
    nps_score INTEGER,
    content_satisfaction INTEGER,
    value_perception TEXT,
    cancel_likelihood TEXT,
    switching_behavior TEXT,
    switching_reason TEXT,
    account_sharing TEXT,
    competitor_awareness TEXT,
    bundle_preference TEXT,
    payment_method TEXT,
    suggestions TEXT,
    logistic_regression REAL,
    risk_level TEXT
)
''')

print("Table created successfully!")
conn.close()
