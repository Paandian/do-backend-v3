# Merimen Integration File Naming Conventions

## 1. Incoming Files from Merimen

### Daily Case Files

- Pattern: `YYYYMMDD_HHMM.csv`
- Example: `20231124_1500.csv`
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

## 2. Processed Files

### Archived Case Files

- Pattern: `PROCESSED_YYYYMMDD_HHMM.csv`
- Example: `PROCESSED_20231124_1500.csv`
- Location: `/processed` directory

### Error Files

- Pattern: `ERROR_YYYYMMDD_HHMM.csv`
- Example: `ERROR_20231124_1500.csv`
- Location: `/error` directory

## 3. Log Files

### Application Logs

- Pattern: `merimen-YYYY-MM-DD.log`
- Example: `merimen-2023-11-24.log`

### Error Logs

- Pattern: `merimen-error-YYYY-MM-DD.log`
- Example: `merimen-error-2023-11-24.log`

## 4. Directory Structure

merimen/
├── incoming/ # Raw incoming files from Merimen │
######├── cases/ # Case CSV files │
######└── images/ # Associated images
├── processed/ # Successfully processed files │
######├── cases/ # Processed case files │
######└── images/ # Processed images
├── error/ # Files with processing errors │
######├── cases/ # Failed case files │
######└── images/ # Failed image uploads
├── temp/ # Temporary processing directory │
######├── cases/ # Case files being processed │
######└── images/ # Images being processed
└── logs/ # Application logs
######├── daily/ # Daily operation logs
######├── error/ # Error logs
######└── audit/ # Audit trail logs

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
