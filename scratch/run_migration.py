import pymysql

host = 'localhost'
user = 'vhvxoigh_mail_auto'
password = 'Ideas@812'
database = 'vhvxoigh_stock'

try:
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    print("Connected to the database successfully.")
    
    with connection.cursor() as cursor:
        # Check if column already exists
        cursor.execute("SHOW COLUMNS FROM batches LIKE 'selling_price'")
        result = cursor.fetchone()
        
        if result:
            print("Column 'selling_price' already exists in table 'batches'.")
        else:
            print("Adding column 'selling_price' to table 'batches'...")
            cursor.execute("ALTER TABLE batches ADD COLUMN selling_price DECIMAL(15,2) DEFAULT 0.00 AFTER import_price")
            connection.commit()
            print("Column 'selling_price' added successfully.")
            
except Exception as e:
    print(f"Error executing migration: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
        print("Database connection closed.")
