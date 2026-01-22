/**
 * Parse manual text input into structured field-value pairs
 * Supports multiple text formats
 */

/**
 * Parse text input and extract field-value pairs
 * @param {string} text - The input text
 * @returns {object} Structured data with headers and rows
 */
export const parseText = (text) => {
  try {
    console.log('Parsing manual text input...');
    console.log('Text length:', text.length);
    
    const fields = {};
    const lines = text.split('\n');
    
    // Try multiple parsing patterns
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Pattern 1: "Key: Value" or "Key : Value"
      const colonMatch = trimmedLine.match(/^(.+?)\s*:\s*(.+)$/);
      if (colonMatch) {
        const [, key, value] = colonMatch;
        if (key && value) {
          fields[key.trim()] = value.trim();
          continue;
        }
      }
      
      // Pattern 2: "Key = Value" or "Key=Value"
      const equalsMatch = trimmedLine.match(/^(.+?)\s*=\s*(.+)$/);
      if (equalsMatch) {
        const [, key, value] = equalsMatch;
        if (key && value) {
          fields[key.trim()] = value.trim();
          continue;
        }
      }
      
      // Pattern 3: "Key - Value" or "Key-Value"
      const dashMatch = trimmedLine.match(/^(.+?)\s*-\s*(.+)$/);
      if (dashMatch) {
        const [, key, value] = dashMatch;
        if (key && value) {
          fields[key.trim()] = value.trim();
          continue;
        }
      }
      
      // Pattern 4: "Key | Value"
      const pipeMatch = trimmedLine.match(/^(.+?)\s*\|\s*(.+)$/);
      if (pipeMatch) {
        const [, key, value] = pipeMatch;
        if (key && value) {
          fields[key.trim()] = value.trim();
          continue;
        }
      }
      
      // Pattern 5: JSON format {"key": "value"}
      if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
        try {
          const jsonData = JSON.parse(trimmedLine);
          Object.assign(fields, jsonData);
          continue;
        } catch (e) {
          // Not valid JSON, skip
        }
      }
      
      // Pattern 6: Tab-separated (Key\tValue)
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t').map(p => p.trim()).filter(p => p);
        if (parts.length === 2) {
          fields[parts[0]] = parts[1];
          continue;
        }
      }
    }
    
    // If JSON block (multi-line)
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      try {
        const jsonData = JSON.parse(text.trim());
        Object.assign(fields, jsonData);
      } catch (e) {
        // Not valid JSON, use line-by-line parsing
      }
    }
    
    console.log(`Extracted ${Object.keys(fields).length} fields from text`);
    
    // Convert to CSV-like format for compatibility
    const headers = Object.keys(fields);
    const row = {};
    headers.forEach(header => {
      row[header] = fields[header];
    });
    
    return {
      headers: headers,
      rows: [row],
      rowCount: 1
    };
    
  } catch (error) {
    console.error('Text parsing error:', error);
    throw new Error(`Failed to parse text: ${error.message}`);
  }
};

/**
 * Generate field mappings from parsed text
 * @param {array} headers - Array of field names
 * @returns {object} Field mappings
 */
export const generateTextFieldMappings = (headers) => {
  const mappings = {};
  
  // Common field name patterns
  const fieldPatterns = [
    { pattern: /(name|full.*name|first.*name)/i, description: 'Name' },
    { pattern: /(email|e-mail)/i, description: 'Email Address' },
    { pattern: /(phone|telephone|mobile|contact)/i, description: 'Phone Number' },
    { pattern: /(address|street)/i, description: 'Address' },
    { pattern: /(city|town)/i, description: 'City' },
    { pattern: /(state|province)/i, description: 'State/Province' },
    { pattern: /(zip|postal.*code|postcode)/i, description: 'Postal Code' },
    { pattern: /(country)/i, description: 'Country' },
    { pattern: /(company|organization)/i, description: 'Company Name' },
    { pattern: /(title|position|job)/i, description: 'Job Title' },
    { pattern: /(date|when)/i, description: 'Date' },
    { pattern: /(signature|sign)/i, description: 'Signature' },
  ];
  
  headers.forEach(header => {
    let matched = false;
    
    for (const { pattern, description } of fieldPatterns) {
      if (pattern.test(header)) {
        mappings[header] = description;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      mappings[header] = header; // Use original name if no match
    }
  });
  
  return mappings;
};
