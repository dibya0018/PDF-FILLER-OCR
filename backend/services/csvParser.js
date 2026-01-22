import Papa from 'papaparse';
import fs from 'fs-extra';

/**
 * Parse CSV file and return structured data
 */
export const parseCSV = async (filePath) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${JSON.stringify(results.errors)}`));
          } else {
            resolve({
              headers: results.meta.fields || [],
              rows: results.data,
              rowCount: results.data.length
            });
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    throw new Error(`Failed to read CSV file: ${error.message}`);
  }
};

/**
 * Convert CSV row to field_data format for Datalab API
 * Maps column names to field descriptions
 */
export const convertRowToFieldData = (row, columnMappings = null) => {
  const fieldData = {};
  
  // Default mapping rules for common field names
  const defaultMappings = {
    'title': 'Title or Company Name',
    'company_name': 'Company Name',
    'company': 'Company Name',
    'surname': 'Surname or Last Name',
    'last_name': 'Surname or Last Name',
    'lastname': 'Surname or Last Name',
    'name': 'First Name',
    'first_name': 'First Name',
    'firstname': 'First Name',
    'street': 'Street Address',
    'address': 'Street Address',
    'address_street': 'Street Address',
    'number': 'Street Number',
    'street_number': 'Street Number',
    'postcode': 'Postal Code',
    'postal_code': 'Postal Code',
    'zip': 'Postal Code',
    'zip_code': 'Postal Code',
    'town': 'Town or City',
    'city': 'Town or City',
    'town_city': 'Town or City',
    'country': 'Country',
    'account_holder': 'Account Holder Name',
    'iban': 'IBAN Number',
    'swift': 'SWIFT Code (BIC)',
    'swift_code': 'SWIFT Code (BIC)',
    'bic': 'SWIFT Code (BIC)',
    'currency': 'Currency',
    'bank_account_number': 'Bank Account Number',
    'account_number': 'Bank Account Number',
    'routing_number': 'Routing Number (US banks)',
    'bank_name': 'Bank Name',
    'bank_street': 'Bank Street Address',
    'bank_address': 'Bank Street Address',
    'bank_number': 'Bank Street Number',
    'bank_postcode': 'Bank Postal Code',
    'bank_zip': 'Bank Postal Code',
    'bank_town': 'Bank Town or City',
    'bank_city': 'Bank Town or City',
    'bank_country': 'Bank Country',
    'swift_correspondent': 'SWIFT Correspondent'
  };
  
  // Use custom mappings if provided, otherwise use defaults
  const mappings = columnMappings || defaultMappings;
  
  for (const [key, value] of Object.entries(row)) {
    if (value && value.toString().trim() !== '') {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      const description = mappings[normalizedKey] || key;
      
      fieldData[key] = {
        value: value.toString().trim(),
        description: description
      };
    }
  }
  
  return fieldData;
};

/**
 * Generate smart field mappings based on column headers
 */
export const generateFieldMappings = (headers) => {
  const mappings = {};
  
  const fieldPatterns = [
    { pattern: /(title|company.*name)/i, description: 'Title or Company Name' },
    { pattern: /(surname|last.*name)/i, description: 'Surname or Last Name' },
    { pattern: /(first.*name|given.*name)/i, description: 'First Name' },
    { pattern: /(street|address.*street)/i, description: 'Street Address' },
    { pattern: /(number|street.*number)/i, description: 'Street Number' },
    { pattern: /(postcode|postal.*code|zip)/i, description: 'Postal Code' },
    { pattern: /(town|city)/i, description: 'Town or City' },
    { pattern: /country/i, description: 'Country' },
    { pattern: /account.*holder/i, description: 'Account Holder Name' },
    { pattern: /iban/i, description: 'IBAN Number' },
    { pattern: /(swift|bic)/i, description: 'SWIFT Code (BIC)' },
    { pattern: /currency/i, description: 'Currency' },
    { pattern: /(bank.*account|account.*number)/i, description: 'Bank Account Number' },
    { pattern: /routing/i, description: 'Routing Number (US banks)' },
    { pattern: /bank.*name/i, description: 'Bank Name' },
  ];
  
  headers.forEach(header => {
    const normalizedKey = header.toLowerCase().replace(/\s+/g, '_');
    let matched = false;
    
    for (const { pattern, description } of fieldPatterns) {
      if (pattern.test(header)) {
        mappings[normalizedKey] = description;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      mappings[normalizedKey] = header;
    }
  });
  
  return mappings;
};
