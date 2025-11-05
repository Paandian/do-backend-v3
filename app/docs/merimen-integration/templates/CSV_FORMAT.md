# CSV File Format Specification for AASB Merimen Integration

## File Naming

- Must follow pattern: `YYYYMMDD_HHMM.csv`
- Example: `20231124_1500.csv`

## File Requirements

- Encoding: UTF-8
- Delimiter: Comma (,)
- File size: Max 10MB
- Must include header row
- Date format: YYYY-MM-DD
- Time format: HH:mm (24-hour)

## Required Columns

| Column Name      | Format     | Example         | Description                 |
| ---------------- | ---------- | --------------- | --------------------------- |
| claim_number     | Text       | MER20231124001  | Unique claim reference      |
| policy_number    | Text       | POL-123456      | Insurance policy number     |
| insured_name     | Text       | John Doe        | Name of insured person      |
| vehicle_number   | Text       | WBA1234         | Vehicle registration number |
| loss_date        | YYYY-MM-DD | 2023-11-24      | Date of incident            |
| loss_time        | HH:mm      | 14:30           | Time of incident            |
| loss_location    | Text       | Jalan Ampang KL | Location of incident        |
| loss_description | Text       | Front collision | Description of damage       |
| contact_person   | Text       | John Doe        | Primary contact name        |
| contact_number   | Text       | +60123456789    | Contact phone number        |
| email            | Text       | john@email.com  | Contact email address       |
| vehicle_make     | Text       | Honda           | Vehicle manufacturer        |
| vehicle_model    | Text       | Civic           | Vehicle model               |
| vehicle_year     | Number     | 2022            | Vehicle manufacture year    |
| workshop_name    | Text       | ABC Workshop    | Repair workshop name        |

## Validation Rules

1. All fields are mandatory
2. claim_number must be unique
3. loss_date cannot be future date
4. email must be valid format
5. contact_number must include country code
6. vehicle_year must be 4 digits

## Sample Data

See `sample_case_template.csv` for example data format.
