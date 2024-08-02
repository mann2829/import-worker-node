import { Job } from 'bull';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import fs from 'fs/promises'; // Use promise-based fs for cleaner code
import path from 'path';
import sequelize from '../config/sequelize';
import Make from '../models/Makes';

// Interfaces for defining the structure of rows and errors
interface ImportRow {
  name: string;
  description: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

interface ImportError {
  row: number;
  column: string;
  error: string;
}

interface ProcessFileResult {
  status: boolean;
  message: string;
  filePath?: string; // Changed from Buffer to file path
}

/**
 * Processes a file job, parsing and inserting data or generating an error report if needed.
 * @param job - Bull job containing the file path to process.
 */
async function processFile(job: Job<{ filePath: string; callback?: (reportPath: string) => void }>): Promise<ProcessFileResult> {
  const { filePath, callback } = job.data;
  console.log('Processing file:', filePath);

  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];
  let rowIndex = 1;

  const fileExtension = path.extname(filePath).toLowerCase();

  try {
    switch (fileExtension) {
      case '.csv':
        await processCSV(filePath, rows, errors, rowIndex);
        break;
      case '.xlsx':
        await processExcel(filePath, rows, errors);
        break;
      default:
        throw new Error('Unsupported file format');
    }

    if (errors.length > 0) {
      const errorReportFilePath = await generateErrorReport(errors);
      if (callback) {
        callback(errorReportFilePath);
      }
      return {
        status: false,
        message: `File processing completed with errors. Error report generated. Total errors: ${errors.length}`,
        filePath: errorReportFilePath // Return file path instead of buffer
      };
    } else {
      await insertData(rows);
      return {
        status: true,
        message: `File processed successfully. ${rows.length} records inserted into the database.`
      };
    }
  } catch (error) {
    handleError(error, 'Error processing file');
    return {
      status: false,
      message: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  } finally {
    await cleanupFile(filePath);
  }
}

/**
 * Validates a row and returns an error if validation fails.
 * @param name - Name from the row.
 * @param description - Description from the row.
 * @param rowNumber - The row number being validated.
 * @returns An ImportError if validation fails, otherwise null.
 */
function validateRow(name: string, description: string, rowNumber: number): ImportError | null {
  if (!name) {
    return { row: rowNumber, column: 'name', error: 'Name is required' };
  }
  if (!description) {
    return { row: rowNumber, column: 'description', error: 'Description is required' };
  }
  return null;
}

/**
 * Processes a CSV file, populating rows and errors arrays.
 * @param filePath - Path to the CSV file.
 * @param rows - Array to hold valid rows.
 * @param errors - Array to hold errors encountered during processing.
 * @param rowIndex - Current row index for error reporting.
 */
async function processCSV(
  filePath: string,
  rows: ImportRow[],
  errors: ImportError[],
  rowIndex: number
) {
  try {
    const csvFileContent = await fs.readFile(filePath);
    const csvStream = csvFileContent.toString().split('\n').slice(1); // Remove header line

    csvStream.forEach((row) => {
      const columns = row.split(',');
      const name = columns[0]?.trim();
      const description = columns[1]?.trim();

      const error = validateRow(name, description, rowIndex);
      if (error) {
        errors.push(error);
      } else {
        rows.push({ name, description });
      }
      rowIndex++;
    });
  } catch (error) {
    handleError(error, 'Error processing CSV');
    throw new Error('Failed to process CSV file.');
  }
}

/**
 * Processes an Excel file, populating rows and errors arrays.
 * @param filePath - Path to the Excel file.
 * @param rows - Array to hold valid rows.
 * @param errors - Array to hold errors encountered during processing.
 */
async function processExcel(
  filePath: string,
  rows: ImportRow[],
  errors: ImportError[]
) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const name = row.getCell(1).value as string;
      const description = row.getCell(2).value as string;

      const error = validateRow(name, description, rowNumber);
      if (error) {
        errors.push(error);
      } else {
        rows.push({ name, description });
      }
    });
  } catch (error) {
    handleError(error, 'Error processing Excel');
    throw new Error('Failed to process Excel file.');
  }
}

/**
 * Inserts valid rows into the database using a transaction.
 * @param rows - Array of valid rows to insert.
 */
async function insertData(rows: ImportRow[]) {
  console.log('Inserting data:', rows);

  try {
    await sequelize.transaction(async (transaction) => {
      const result = await Make.bulkCreate(rows, { transaction });
      console.log('Insert result:', result);
    });
  } catch (error) {
    handleError(error, 'Error inserting data');
    throw new Error('Failed to insert data into the database.');
  }
}

/**
 * Generates an error report as an Excel file and saves it to disk.
 * @param errors - Array of errors to include in the report.
 * @returns The file path of the generated error report.
 */
async function generateErrorReport(errors: ImportError[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Errors');

  worksheet.columns = [
    { header: 'Row', key: 'row', width: 10 },
    { header: 'Column', key: 'column', width: 20 },
    { header: 'Error', key: 'error', width: 30 },
  ];

  errors.forEach((error) => {
    worksheet.addRow(error);
  });

  const tempFilePath = path.join(__dirname, 'error_report.xlsx');
  await workbook.xlsx.writeFile(tempFilePath);

  console.log('Error report generated:', tempFilePath);

  return tempFilePath; // Return file path instead of buffer
}

/**
 * Cleans up the uploaded file by deleting it.
 * @param filePath - Path to the file to be deleted.
 */
async function cleanupFile(filePath: string) {
  try {
    await fs.unlink(filePath);
    console.log('File cleaned up:', filePath);
  } catch (error) {
    handleError(error, 'Error cleaning up file');
  }
}

/**
 * Handles errors of type unknown and logs appropriate messages.
 * @param error - The unknown error object.
 * @param message - Custom error message to log.
 */
function handleError(error: unknown, message: string) {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(`${message}:`, error);
  }
}

export default processFile;
