import Papa from "papaparse";
import { RecipientData } from "@/types/dm-creative";

export interface CSVRow {
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  customMessage?: string;
}

export interface CSVProcessResult {
  success: boolean;
  recipients: RecipientData[];
  errors: string[];
}

export function parseCSV(file: File): Promise<CSVProcessResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const recipients: RecipientData[] = [];

        (results.data as CSVRow[]).forEach((row, index) => {
          // Validate required fields
          if (!row.name || !row.lastname) {
            errors.push(
              `Row ${index + 1}: Missing required fields (name, lastname)`
            );
            return;
          }

          recipients.push({
            name: row.name.trim(),
            lastname: row.lastname.trim(),
            address: row.address?.trim() || "",
            city: row.city?.trim() || "",
            zip: row.zip?.trim() || "",
            customMessage: row.customMessage?.trim() || "",
          });
        });

        resolve({
          success: errors.length === 0,
          recipients,
          errors,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          recipients: [],
          errors: [`Failed to parse CSV: ${error.message}`],
        });
      },
    });
  });
}

export function generateSampleCSV(): string {
  const headers = ["name", "lastname", "address", "city", "zip", "customMessage"];
  const sampleRows = [
    ["John", "Doe", "123 Main St", "New York", "10001", ""],
    ["Jane", "Smith", "456 Oak Ave", "Los Angeles", "90001", ""],
    ["Bob", "Johnson", "789 Pine Rd", "Chicago", "60601", ""],
  ];

  return [headers, ...sampleRows].map((row) => row.join(",")).join("\n");
}
