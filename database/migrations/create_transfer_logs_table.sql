CREATE TABLE IF NOT EXISTS transfer_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    size_bytes BIGINT,
    transfer_time INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_file_name (file_name),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
