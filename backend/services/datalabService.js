import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';

const DATALAB_API_BASE = 'https://www.datalab.to/api/v1';

/**
 * Fill PDF form using Datalab API
 */
export const fillPDFForm = async (pdfPath, fieldData, context = '', apiKey) => {
  try {
    const formData = new FormData();
    
    // Add the PDF file
    formData.append('file', fs.createReadStream(pdfPath));
    
    // Add field data as JSON string
    formData.append('field_data', JSON.stringify(fieldData));
    
    // Add optional context
    if (context) {
      formData.append('context', context);
    }
    
    // Add confidence threshold
    formData.append('confidence_threshold', '0.5');
    
    // Add skip_cache flag
    formData.append('skip_cache', 'false');
    
    console.log('Sending request to Datalab API...');
    console.log('Field data:', JSON.stringify(fieldData, null, 2));
    
    // Make the API request
    const response = await axios.post(
      `${DATALAB_API_BASE}/fill`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'X-API-Key': apiKey
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    
    console.log('Datalab API response:', response.data);
    
    // Return the request_id to check status
    return {
      requestId: response.data.request_id,
      status: response.data.status
    };
  } catch (error) {
    console.error('Error calling Datalab API:', error.response?.data || error.message);
    throw new Error(`Datalab API error: ${error.response?.data?.error || error.message}`);
  }
};

/**
 * Check the status of a form filling request
 */
export const checkFillStatus = async (requestId, apiKey) => {
  try {
    const response = await axios.get(
      `${DATALAB_API_BASE}/fill/${requestId}`,
      {
        headers: {
          'X-API-Key': apiKey
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error checking fill status:', error.response?.data || error.message);
    throw new Error(`Status check error: ${error.response?.data?.error || error.message}`);
  }
};

/**
 * Download the filled PDF
 */
export const downloadFilledPDF = async (fileUrl, outputPath) => {
  try {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });
    
    await fs.writeFile(outputPath, response.data);
    return outputPath;
  } catch (error) {
    console.error('Error downloading filled PDF:', error.message);
    throw new Error(`Download error: ${error.message}`);
  }
};

/**
 * Poll for completion and download the filled PDF
 */
export const pollAndDownloadPDF = async (requestId, outputPath, apiKey, maxAttempts = 90, intervalMs = 3000) => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const status = await checkFillStatus(requestId, apiKey);
    
    console.log(`Poll attempt ${attempts + 1}/${maxAttempts}, status: ${status.status}`);
    
    // Check for complete, completed or finished status
    if (status.status === 'complete' || status.status === 'completed' || status.status === 'finished') {
      console.log('Form filling completed successfully!');
      
      // Check for base64 output (most common)
      if (status.output_base64 && status.output_base64 !== '') {
        const base64Data = status.output_base64;
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(outputPath, buffer);
        console.log(`PDF saved to: ${outputPath}`);
        
        return {
          success: true,
          filePath: outputPath,
          fieldsFilledCount: (status.fields_filled && status.fields_filled.length) || 0
        };
      }
      
      // Check for URL-based output (alternative)
      const outputUrl = status.output_url || status.output_file_url || status.file_url || status.download_url || status.url;
      if (outputUrl) {
        await downloadFilledPDF(outputUrl, outputPath);
        return {
          success: true,
          filePath: outputPath,
          fieldsFilledCount: status.fields_filled_count || status.fieldsFilledCount || 0
        };
      }
      
      throw new Error(`No output data in completed response. Available fields: ${Object.keys(status).join(', ')}`);
    } else if (status.status === 'failed' || status.status === 'error') {
      throw new Error(`Form filling failed: ${status.error || 'Unknown error'}`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    attempts++;
  }
  
  throw new Error('Timeout waiting for form filling to complete');
};
