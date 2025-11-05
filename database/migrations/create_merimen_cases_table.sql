-- First ensure the parent tables exist
CREATE TABLE IF NOT EXISTS insurers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS casefiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    -- other casefile fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Now create merimen_cases table with proper foreign key constraints
CREATE TABLE IF NOT EXISTS merimen_cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    merimen_ref VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique reference from Merimen',
    casefile_id INT NULL COMMENT 'Link to internal casefile',
    insurer_id INT NULL,
    claim_no VARCHAR(100),
    vehicle_no VARCHAR(50),
    date_of_loss DATE,
    date_received DATETIME,
    status VARCHAR(20) DEFAULT 'NEW',
    raw_data JSON COMMENT 'Original data from Merimen',
    is_processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    processing_attempts INT DEFAULT 0,
    last_attempt_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_merimen_casefile 
        FOREIGN KEY (casefile_id) 
        REFERENCES casefiles(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_merimen_insurer
        FOREIGN KEY (insurer_id) 
        REFERENCES insurers(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    
    INDEX idx_merimen_ref (merimen_ref),
    INDEX idx_status (status),
    INDEX idx_date_received (date_received),
    INDEX idx_vehicle_no (vehicle_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
