# AASB Merimen Integration File Naming Conventions

## 1. SFTP Integration Overview

The integration workflow:

1. Client uploads CSV file to AASB's SFTP server
2. Application monitors SFTP directory for new files
3. Files are processed and data is injected into merimen_cases table
4. Processed files are archived

## 2. Incoming SFTP Files

### Case Files

- Pattern: `YYYYMMDD_HHMM.csv`
- Example: `20231124_1500.csv`
- Location: `/sftp/incoming/`
- Components:
  - YYYY: Year (4 digits)
  - MM: Month (2 digits)
  - DD: Day (2 digits)
  - HH: Hour in 24-hour format
  - MM: Minutes

### Image Files

- Pattern: `[MERIMEN_REF]_[TYPE]_[SEQUENCE].{jpg|png|pdf}`
- Example: `MER123456_DAMAGE_01.jpg`
- Components:
  - MERIMEN_REF: Unique reference from Merimen
  - TYPE: Type of image (DAMAGE, REPAIR, DOCS)
  - SEQUENCE: Two-digit sequence number
  - Extension: jpg, png, or pdf

## 3. Database Integration

### Merimen Cases Table

- Target: `merimen_cases` table in MySQL
- Processing: Real-time as files arrive
- Status tracking: File processing status stored in database

## 4. Directory Structure

sftp/
├── incoming/ # SFTP upload directory for clients
├── processed/ # Successfully processed files
├── error/ # Files with processing errors
└── logs/ # Application logs
├── daily/ # Daily operation logs
└── error/ # Error logs

## 5. File Processing Rules

1. All incoming files must follow the exact naming convention
2. Files not matching the pattern will be moved to error directory
3. Files are processed in chronological order
4. Processed files are archived with date stamp
5. Maximum file size:
   - CSV files: 10MB
   - Images: 5MB per file
   - PDF documents: 20MB
6. File encoding: UTF-8
7. Date/time values: ISO 8601 format

## 6. Retention Policy

1. Incoming Files:

   - Active files: 24 hours
   - After processing: Moved to processed/error directory

2. Processed Files:

   - Cases: 30 days
   - Images: 90 days
   - Error files: 90 days

3. Log Files:

   - Daily logs: 14 days
   - Error logs: 30 days
   - Audit logs: 90 days

4. Temp Files:
   - Cleared after processing
   - Maximum age: 24 hours

## 7. Access Control

1. Read/Write Access:

   - Application service account
   - System administrators

2. Read-only Access:

   - Support team
   - Auditors
   - Quality assurance team

3. No Access:
   - Regular users
   - External systems

## 8. Monitoring

1. Directory Size:

   - Maximum size per directory: 50GB
   - Alert threshold: 80% capacity

2. File Count:

   - Maximum files per directory: 10,000
   - Alert threshold: 8,000 files

3. Processing Time:
   - Maximum processing time: 5 minutes per file
   - Alert threshold: > 3 minutes

## 9. Backup Strategy

1. Frequency:

   - Processed files: Daily
   - Error files: Daily
   - Logs: Weekly

2. Retention:
   - Daily backups: 7 days
   - Weekly backups: 4 weeks
   - Monthly backups: 3 months

## 10. SFTP Access Control

1. Client Access:

   - Restricted to incoming directory
   - Write-only permissions
   - Unique SFTP credentials per client

2. AASB Access:

   - Full access to all directories
   - Monitoring and maintenance capabilities

3. Security:
   - SSH key-based authentication
   - IP whitelisting
   - Activity logging
