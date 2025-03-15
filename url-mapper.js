/**
 * Generic URL Mapper
 * 
 * This script maps URLs from an old site to a new site using SKU matching and name-based similarity.
 * It detects and prevents redirect loops, handles various CSV formats, and generates comprehensive reports.
 * 
 * Usage: node generic-url-mapper.js [options]
 * 
 * Configuration: Edit the CONFIG object below to customize for your project.
 */

const fs = require('fs');
const path = require('path');

// ======================================
// CONFIGURATION - Edit these settings
// ======================================
const CONFIG = {
  // Input/Output files
  oldUrlsFile: 'old-urls.csv',
  newUrlsFile: 'new-urls.csv',
  outputFile: 'url-mapping.csv',
  loopsFile: 'skipped-loops.csv',
  
  // Base URL for the new site (used for category redirects)
  newSiteBaseUrl: 'https://example.com',
  
  // CSV parsing options
  csvDelimiters: [',', '\t', ';', ' '],
  hasHeaderRow: 'auto', // 'auto', true, or false
  
  // Matching options
  similarityThreshold: 0.5,      // Minimum similarity score to consider a match
  highConfidenceThreshold: 0.8,  // Threshold for high confidence matches
  mediumConfidenceThreshold: 0.6, // Threshold for medium confidence matches
  
  // URL patterns
  productUrlPatterns: ['/product/', '/shop/'],
  categoryUrlPatterns: ['/product-category/', '/category/', '/shop/'],
  
  // Category mappings (old category slug -> new category path)
  categoryMappings: {
    // Example: 'old-category': '/new-category-path/',
  },
  
  // Batch processing to manage memory usage
  batchSize: 250,
  
  // Debug options
  verbose: true,
  showSamples: true,
  sampleSize: 5
};

// ======================================
// UTILITY FUNCTIONS
// ======================================

// Log message if verbose mode is enabled
function log(message) {
  if (CONFIG.verbose) {
    console.log(message);
  }
}

// Fetch and parse CSV data from local file
async function fetchCSV(source) {
  try {
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    
    const text = fs.readFileSync(source, 'utf8');
    log(`Read file: ${source} (${text.length} bytes)`);
    
    // Parse the CSV data
    const lines = text.split('\n').filter(line => line.trim() !== '');
    log(`Found ${lines.length} non-empty lines in ${source}`);
    
    // Determine if there's a header row
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0];
      let hasHeader = CONFIG.hasHeaderRow;
      
      if (hasHeader === 'auto') {
        // Auto-detect header: if first line doesn't look like data
        hasHeader = !CONFIG.productUrlPatterns.some(pattern => firstLine.includes(pattern)) && 
                   !firstLine.includes('http') &&
                   !firstLine.match(/^[A-Z]{2}\.\d+\.\d+/);
      }
      
      if (hasHeader === true) {
        startIndex = 1;
        log(`Skipping header row: ${firstLine}`);
      }
    }
    
    // Parse each line
    const entries = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Detect delimiter and parse
      let parts = null;
      
      // Try each configured delimiter
      for (const delimiter of CONFIG.csvDelimiters) {
        if (delimiter === ' ') {
          // Special handling for space delimiter
          const spaceIndex = line.indexOf(' ');
          if (spaceIndex > 0) {
            parts = [
              line.substring(0, spaceIndex),
              line.substring(spaceIndex + 1)
            ];
            break;
          }
        } else if (line.includes(delimiter)) {
          parts = line.split(delimiter);
          break;
        }
      }
      
      if (!parts) {
        log(`Warning: Could not parse line: ${line}`);
        continue;
      }
      
      // Clean up parts
      parts = parts.map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length >= 2) {
        const sku = parts[0];
        const url = parts[1];
        entries.push({ sku, url });
      } else {
        log(`Warning: Line has insufficient columns: ${line}`);
      }
    }
    
    log(`Successfully parsed ${entries.length} entries from ${source}`);
    
    // Show sample entries
    if (CONFIG.showSamples && entries.length > 0) {
      log(`Sample entries from ${source}:`);
      entries.slice(0, CONFIG.sampleSize).forEach(entry => {
        log(`  SKU: ${entry.sku}, URL: ${entry.url}`);
      });
    }
    
    return entries;
  } catch (error) {
    console.error(`Error reading CSV: ${error.message}`);
    return [];
  }
}

// Extract product name from URL
function extractProductName(url) {
  try {
    // Handle URLs that don't start with http
    const fullUrl = url.startsWith('http') ? url : `https://example.com${url}`;
    const urlObj = new URL(fullUrl);
    const path = urlObj.pathname;
    
    const segments = path.split('/').filter(s => s);
    let productName = segments[segments.length - 1];
    
    // Check for product URL patterns
    for (const pattern of CONFIG.productUrlPatterns) {
      if (path.includes(pattern)) {
        const patternIndex = segments.indexOf(pattern.replace(/\//g, ''));
        if (patternIndex >= 0 && patternIndex < segments.length - 1) {
          productName = segments[patternIndex + 1];
        } else {
          // Use last segment as fallback
          productName = segments[segments.length - 1];
        }
        break;
      }
    }
    
    return cleanProductName(productName);
  } catch (e) {
    console.error(`Error extracting product name from URL: ${url}`, e);
    return '';
  }
}

// Clean product name by removing specifications and common suffixes
function cleanProductName(name) {
  if (!name) return '';
  
  let cleaned = name.replace(/-[0-9]$/, '');
  cleaned = cleaned.replace(/-\d+x\d+x\d+/, '');
  cleaned = cleaned.replace(/-\d+x\d+/, '');
  cleaned = cleaned.replace(/-\d+-?mil/, '');
  cleaned = cleaned.replace(/-\d+-?inch/, '');
  cleaned = cleaned.replace(/-\d+-?oz/, '');
  cleaned = cleaned.replace(/-\d+-?lb/, '');
  cleaned = cleaned.replace(/-\d+-?gal/, '');
  cleaned = cleaned.replace(/-+$/, '');
  
  return cleaned;
}

// Calculate similarity between two product names
function calculateNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  
  if (n1 === n2) return 1.0;
  if (n1.includes(n2)) return 0.9;
  if (n2.includes(n1)) return 0.9;
  
  const words1 = new Set(n1.split('-'));
  const words2 = new Set(n2.split('-'));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Check if two URLs are effectively the same (to prevent redirect loops)
function areUrlsEffectivelySame(oldUrl, newUrl) {
  try {
    // Normalize URLs for comparison
    const normalizeUrl = (url) => {
      // Handle URLs that don't start with http
      const fullUrl = url.startsWith('http') ? url : `https://example.com${url}`;
      const urlObj = new URL(fullUrl);
      
      // Get path and remove trailing slashes
      let path = urlObj.pathname;
      path = path.replace(/\/+$/, '');
      
      // Convert to lowercase for case-insensitive comparison
      return path.toLowerCase();
    };
    
    const oldPath = normalizeUrl(oldUrl);
    const newPath = normalizeUrl(newUrl);
    
    // Check if paths are identical
    if (oldPath === newPath) {
      return true;
    }
    
    // Check if one is just the other with a trailing slash
    if (oldPath + '/' === newPath || oldPath === newPath + '/') {
      return true;
    }
    
    return false;
  } catch (e) {
    console.error(`Error comparing URLs: ${oldUrl} and ${newUrl}`, e);
    return false;
  }
}

// Process a single batch of URLs
function processBatch(oldProducts, newProductIndex, skuIndex) {
  const mapping = [];
  const unmapped = [];
  const categoryMappings = [];
  const loopDetected = []; // Track potential redirect loops
  
  for (let i = 0; i < oldProducts.length; i++) {
    const oldProduct = oldProducts[i];
    
    // Try SKU matching first for product pages
    if (oldProduct.sku && skuIndex[oldProduct.sku]) {
      const newProduct = skuIndex[oldProduct.sku];
      
      // Check for potential redirect loops
      if (areUrlsEffectivelySame(oldProduct.url, newProduct.url)) {
        loopDetected.push({
          oldURL: oldProduct.url,
          newURL: newProduct.url,
          reason: 'identical_urls',
          sku: oldProduct.sku
        });
        continue;
      }
      
      mapping.push({
        oldURL: oldProduct.url,
        newURL: newProduct.url,
        oldName: extractProductName(oldProduct.url),
        newName: extractProductName(newProduct.url),
        matchType: 'sku_match',
        similarity: '1.00',
        sku: oldProduct.sku
      });
      continue;
    }
    
    // Determine if this is a product or category URL
    const isProduct = CONFIG.productUrlPatterns.some(pattern => oldProduct.url.includes(pattern));
    const isCategory = CONFIG.categoryUrlPatterns.some(pattern => oldProduct.url.includes(pattern));
    
    if (!isProduct) {
      if (isCategory) {
        try {
          const urlObj = new URL(oldProduct.url.startsWith('http') ? oldProduct.url : `https://example.com${oldProduct.url}`);
          const path = urlObj.pathname;
          const segments = path.split('/').filter(s => s);
          
          // Try to find a category match
          const categorySlug = segments.find(segment => 
            Object.keys(CONFIG.categoryMappings).some(key => segment === key)
          );
          
          if (categorySlug && CONFIG.categoryMappings[categorySlug]) {
            const newCategoryUrl = `${CONFIG.newSiteBaseUrl}${CONFIG.categoryMappings[categorySlug]}`;
            
            // Check for potential redirect loops
            if (areUrlsEffectivelySame(oldProduct.url, newCategoryUrl)) {
              loopDetected.push({
                oldURL: oldProduct.url,
                newURL: newCategoryUrl,
                reason: 'identical_category',
              });
              continue;
            }
            
            categoryMappings.push({
              oldURL: oldProduct.url,
              newURL: newCategoryUrl,
              matchType: 'category_redirect',
              similarity: '1.00'
            });
          } else {
            categoryMappings.push({
              oldURL: oldProduct.url,
              category: segments.join('/')
            });
          }
        } catch (e) {
          console.error(`Error processing category URL: ${oldProduct.url}`);
        }
      }
      continue;
    }
    
    // For products without SKU match, try name-based matching
    const productName = extractProductName(oldProduct.url);
    if (!productName) {
      unmapped.push(oldProduct.url);
      continue;
    }
    
    let bestMatches = newProductIndex[productName] || [];
    
    if (bestMatches.length === 0) {
      const similarities = [];
      
      for (const [name, products] of Object.entries(newProductIndex)) {
        const similarity = calculateNameSimilarity(productName, name);
        if (similarity > CONFIG.similarityThreshold) {
          similarities.push({
            similarity,
            products
          });
        }
      }
      
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      if (similarities.length > 0) {
        bestMatches = similarities[0].products;
      }
    }
    
    if (bestMatches.length > 0) {
      const bestMatch = bestMatches[0];
      
      // Check for potential redirect loops
      if (areUrlsEffectivelySame(oldProduct.url, bestMatch.url)) {
        loopDetected.push({
          oldURL: oldProduct.url,
          newURL: bestMatch.url,
          reason: 'identical_product',
          oldName: productName,
          newName: extractProductName(bestMatch.url)
        });
        continue;
      }
      
      const similarity = calculateNameSimilarity(productName, extractProductName(bestMatch.url));
      
      let matchType;
      if (similarity === 1.0) {
        matchType = 'exact_match';
      } else if (similarity >= CONFIG.highConfidenceThreshold) {
        matchType = 'high_confidence_match';
      } else if (similarity >= CONFIG.mediumConfidenceThreshold) {
        matchType = 'medium_confidence_match';
      } else {
        matchType = 'low_confidence_match';
      }
      
      mapping.push({
        oldURL: oldProduct.url,
        newURL: bestMatch.url,
        oldName: productName,
        newName: extractProductName(bestMatch.url),
        matchType,
        similarity: similarity.toFixed(2)
      });
    } else {
      unmapped.push(oldProduct.url);
    }
  }
  
  return { mapping, unmapped, categoryMappings, loopDetected };
}

// Main function to generate URL mapping
async function generateURLMapping() {
  console.log("Generating URL mapping with SKU matching and loop detection...");
  console.log("Using configuration:");
  console.log(`- Old URLs file: ${CONFIG.oldUrlsFile}`);
  console.log(`- New URLs file: ${CONFIG.newUrlsFile}`);
  console.log(`- Output file: ${CONFIG.outputFile}`);
  console.log(`- New site base URL: ${CONFIG.newSiteBaseUrl}`);
  console.log(`- Similarity threshold: ${CONFIG.similarityThreshold}`);
  console.log(`- Batch size: ${CONFIG.batchSize}`);

  try {
    // Get the directory of the current script
    const scriptDir = __dirname;
    
    // Local CSV file paths
    const oldUrlsFile = path.join(scriptDir, CONFIG.oldUrlsFile);
    const newUrlsFile = path.join(scriptDir, CONFIG.newUrlsFile);
    
    log(`Looking for CSV files in: ${scriptDir}`);
    
    // Check if files exist
    if (!fs.existsSync(oldUrlsFile)) {
      console.error(`Error: File not found: ${oldUrlsFile}`);
      console.error(`Please make sure ${CONFIG.oldUrlsFile} is in the same directory as this script.`);
      return;
    }
    
    if (!fs.existsSync(newUrlsFile)) {
      console.error(`Error: File not found: ${newUrlsFile}`);
      console.error(`Please make sure ${CONFIG.newUrlsFile} is in the same directory as this script.`);
      return;
    }
    
    // Fetch URLs with SKUs
    const oldURLs = await fetchCSV(oldUrlsFile);
    const newURLs = await fetchCSV(newUrlsFile);

    console.log(`Processing ${oldURLs.length} old URLs and ${newURLs.length} new URLs`);
    
    if (oldURLs.length === 0 || newURLs.length === 0) {
      console.error("Error: One or both CSV files are empty or could not be parsed correctly.");
      return;
    }

    // Create SKU index for direct matching
    const skuIndex = {};
    newURLs.forEach(entry => {
      if (entry.sku) {
        skuIndex[entry.sku] = entry;
      }
    });
    
    log(`Created SKU index with ${Object.keys(skuIndex).length} entries`);

    // Create product name index for fallback matching
    const newProductIndex = {};
    newURLs.forEach(entry => {
      const productName = extractProductName(entry.url);
      if (productName) {
        if (!newProductIndex[productName]) {
          newProductIndex[productName] = [];
        }
        newProductIndex[productName].push(entry);
      }
    });
    
    log(`Created product name index with ${Object.keys(newProductIndex).length} entries`);

    // Process in batches
    const batchSize = CONFIG.batchSize;
    const totalBatches = Math.ceil(oldURLs.length / batchSize);
    
    let allMappings = [];
    let allUnmapped = [];
    let allCategoryMappings = [];
    let allLoopDetected = []; // Track all potential redirect loops
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      log(`\nProcessing batch ${batchNum + 1} of ${totalBatches}...`);
      
      const startIndex = batchNum * batchSize;
      const endIndex = Math.min((batchNum + 1) * batchSize, oldURLs.length);
      const batchURLs = oldURLs.slice(startIndex, endIndex);
      
      const { mapping, unmapped, categoryMappings, loopDetected } = processBatch(batchURLs, newProductIndex, skuIndex);
      
      log(`Batch ${batchNum + 1} results:`);
      log(`- Mapped: ${mapping.length} URLs`);
      log(`- Unmapped: ${unmapped.length} URLs`);
      log(`- Categories: ${categoryMappings.length} URLs`);
      log(`- Potential loops: ${loopDetected.length} URLs`);
      
      allMappings = allMappings.concat(mapping);
      allUnmapped = allUnmapped.concat(unmapped);
      allCategoryMappings = allCategoryMappings.concat(categoryMappings);
      allLoopDetected = allLoopDetected.concat(loopDetected);
    }

    console.log(`\nFinal results:`);
    console.log(`Successfully mapped ${allMappings.length} product URLs`);
    console.log(`Unable to map ${allUnmapped.length} product URLs`);
    console.log(`Found ${allCategoryMappings.length} category URLs`);
    console.log(`Detected ${allLoopDetected.length} potential redirect loops (skipped)`);

    // Count match types
    const matchTypeCounts = {};
    allMappings.forEach(({ matchType }) => {
      matchTypeCounts[matchType] = (matchTypeCounts[matchType] || 0) + 1;
    });

    console.log("\nMatch type distribution:");
    Object.entries(matchTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`- ${type}: ${count} (${Math.round(count/allMappings.length*100)}%)`);
      });

    // Sample results
    if (CONFIG.showSamples) {
      console.log("\nSample of mapped URLs:");
      allMappings.slice(0, CONFIG.sampleSize).forEach(({ oldURL, newURL, oldName, newName, matchType, similarity, sku }) => {
        console.log(`- ${oldURL} → ${newURL}`);
        console.log(`  Product: "${oldName}" → "${newName}"`);
        console.log(`  Match type: ${matchType}, Similarity: ${similarity}${sku ? `, SKU: ${sku}` : ''}`);
      });

      console.log("\nSample of unmapped URLs:");
      allUnmapped.slice(0, CONFIG.sampleSize).forEach(url => console.log(`- ${url}`));
      
      // Sample of detected loops
      if (allLoopDetected.length > 0) {
        console.log("\nSample of detected redirect loops (skipped):");
        allLoopDetected.slice(0, CONFIG.sampleSize).forEach(loop => {
          console.log(`- ${loop.oldURL} → ${loop.newURL}`);
          console.log(`  Reason: ${loop.reason}`);
        });
      }
    }

    // Save complete results to CSV file
    let fullCsvContent = "old_url,new_url,old_name,new_name,match_type,similarity,sku\n";
    
    // Add all product mappings
    allMappings.forEach(({ oldURL, newURL, oldName, newName, matchType, similarity, sku }) => {
      fullCsvContent += `"${oldURL}","${newURL}","${oldName}","${newName}","${matchType}","${similarity}","${sku || ''}"\n`;
    });
    
    // Add all category redirects
    allCategoryMappings.forEach(mapping => {
      if (mapping.newURL) {
        fullCsvContent += `"${mapping.oldURL}","${mapping.newURL}","","","${mapping.matchType}","${mapping.similarity}",""\n`;
      }
    });
    
    // Write to file
    const outputFile = path.join(scriptDir, CONFIG.outputFile);
    fs.writeFileSync(outputFile, fullCsvContent);
    console.log(`\nComplete CSV file has been saved as: ${outputFile}`);
    
    // Save detected loops to a separate CSV file
    if (allLoopDetected.length > 0) {
      let loopsCsvContent = "old_url,new_url,reason,old_name,new_name,sku\n";
      
      allLoopDetected.forEach(({ oldURL, newURL, reason, oldName, newName, sku }) => {
        loopsCsvContent += `"${oldURL}","${newURL}","${reason}","${oldName || ''}","${newName || ''}","${sku || ''}"\n`;
      });
      
      const loopsFile = path.join(scriptDir, CONFIG.loopsFile);
      fs.writeFileSync(loopsFile, loopsCsvContent);
      console.log(`\nPotential redirect loops have been saved as: ${loopsFile}`);
    }

    console.log("\nURL mapping complete!");

  } catch (error) {
    console.error("Error in URL mapping process:", error);
    console.error(error.stack);
  }
}

// Execute the main function
generateURLMapping();