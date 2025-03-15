const fetch = require('node-fetch');
const fs = require('fs');

// Fetch and parse CSV data from remote URL or local file
async function fetchCSV(source) {
  try {
    let text;
    
    if (source.startsWith('http://') || source.startsWith('https://')) {
      console.log(`Fetching remote file: ${source}`);
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
      }
      text = await response.text();
      console.log(`Successfully fetched ${source} (${text.length} bytes)`);
    } else {
      if (!fs.existsSync(source)) {
        throw new Error(`File not found: ${source}`);
      }
      text = fs.readFileSync(source, 'utf8');
      console.log(`Read local file: ${source} (${text.length} bytes)`);
    }
    
    // Parse the CSV data
    const lines = text.split('\n').filter(line => line.trim() !== '');
    console.log(`Found ${lines.length} non-empty lines in ${source}`);
    
    // Check if there's a header row
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0];
      // Skip header if it doesn't look like data
      if (!firstLine.includes('/product/') && 
          !firstLine.includes('http') &&
          !firstLine.match(/^[A-Z]{2}\.\d+\.\d+/)) {
        startIndex = 1;
        console.log(`Skipping header row: ${firstLine}`);
      }
    }
    
    // Parse each line
    const entries = [];
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Detect delimiter and parse
      let parts;
      if (line.includes(',')) {
        parts = line.split(',');
      } else if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else {
        // Space-separated - assume first word is SKU, rest is URL
        const spaceIndex = line.indexOf(' ');
        if (spaceIndex > 0) {
          parts = [
            line.substring(0, spaceIndex),
            line.substring(spaceIndex + 1)
          ];
        } else {
          console.log(`Warning: Could not parse line: ${line}`);
          continue;
        }
      }
      
      // Clean up parts
      parts = parts.map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length >= 2) {
        const sku = parts[0];
        const url = parts[1];
        entries.push({ sku, url });
      } else {
        console.log(`Warning: Line has insufficient columns: ${line}`);
      }
    }
    
    console.log(`Successfully parsed ${entries.length} entries from ${source}`);
    
    // Show sample entries
    if (entries.length > 0) {
      console.log(`Sample entries from ${source}:`);
      entries.slice(0, 3).forEach(entry => {
        console.log(`  SKU: ${entry.sku}, URL: ${entry.url}`);
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
    
    if (path.includes('/product/') && segments.length > 1) {
      const productIndex = segments.indexOf('product');
      if (productIndex < segments.length - 1) {
        productName = segments[productIndex + 1];
      }
    }
    
    if (path.includes('/shop/') && segments.length > 2) {
      productName = segments[segments.length - 1];
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

// Category mappings
const categoryMappings = {
  'corrugate': '/product-category/corrugated-boxes/',
  'stretch-film': '/product-category/stretch-wrap-film/',
  'tapes-adhesives': '/product-category/tapes-adhesives/',
  'shipping-mailing': '/product-category/shipping-supplies/',
  'health-safety': '/product-category/safety-supplies/',
  'janitorial': '/product-category/janitorial-supplies/',
  'labelling': '/product-category/labels/',
  'plastic-poly': '/product-category/poly-bags/',
  'protective-packaging': '/product-category/protective-packaging/',
  'strapping': '/product-category/strapping/',
  'material-handling': '/product-category/material-handling/',
  'keygifts': '/keygifts/',
};

// Process a single batch of URLs
function processBatch(oldProducts, newProductIndex, skuIndex) {
  const mapping = [];
  const unmapped = [];
  const categoryMappings = [];
  
  for (let i = 0; i < oldProducts.length; i++) {
    const oldProduct = oldProducts[i];
    
    // Try SKU matching first for product pages
    if (oldProduct.sku && skuIndex[oldProduct.sku]) {
      const newProduct = skuIndex[oldProduct.sku];
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
    
    // If no SKU match, proceed with existing logic
    const isProduct = oldProduct.url.includes('/product/') || 
                     (oldProduct.url.includes('/shop/') && oldProduct.url.split('/').filter(s => s).length > 2);
    const isCategory = oldProduct.url.includes('/product-category/') || 
                      (oldProduct.url.includes('/shop/') && oldProduct.url.split('/').filter(s => s).length <= 3);
    
    if (!isProduct) {
      if (isCategory) {
        try {
          const urlObj = new URL(oldProduct.url.startsWith('http') ? oldProduct.url : `https://example.com${oldProduct.url}`);
          const path = urlObj.pathname;
          const segments = path.split('/').filter(s => s);
          
          const categorySlug = segments.find(segment => 
            Object.keys(categoryMappings).some(key => segment === key)
          );
          
          if (categorySlug && categoryMappings[categorySlug]) {
            categoryMappings.push({
              oldURL: oldProduct.url,
              newURL: `https://keypak.tbkdev.com${categoryMappings[categorySlug]}`,
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
        if (similarity > 0.5) {
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
      const similarity = calculateNameSimilarity(productName, extractProductName(bestMatch.url));
      
      let matchType;
      if (similarity === 1.0) {
        matchType = 'exact_match';
      } else if (similarity >= 0.8) {
        matchType = 'high_confidence_match';
      } else if (similarity >= 0.6) {
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
  
  return { mapping, unmapped, categoryMappings };
}

// Main function to generate URL mapping
async function generateURLMapping() {
  console.log("Generating URL mapping with SKU matching...");

  try {
    // Remote CSV file URLs
    const oldUrlsFile = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/old-urls-ZUpQOAF2HhWXikcmRjXi9WlKLU4HA8.csv';
    const newUrlsFile = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/new-urls-vgNeLmyWAN9yv8fCknKBLiecN730fZ.csv';
    
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
    
    console.log(`Created SKU index with ${Object.keys(skuIndex).length} entries`);

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
    
    console.log(`Created product name index with ${Object.keys(newProductIndex).length} entries`);

    // Process in batches
    const batchSize = 250;
    const totalBatches = Math.ceil(oldURLs.length / batchSize);
    
    let allMappings = [];
    let allUnmapped = [];
    let allCategoryMappings = [];
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      console.log(`\nProcessing batch ${batchNum + 1} of ${totalBatches}...`);
      
      const startIndex = batchNum * batchSize;
      const endIndex = Math.min((batchNum + 1) * batchSize, oldURLs.length);
      const batchURLs = oldURLs.slice(startIndex, endIndex);
      
      const { mapping, unmapped, categoryMappings } = processBatch(batchURLs, newProductIndex, skuIndex);
      
      console.log(`Batch ${batchNum + 1} results:`);
      console.log(`- Mapped: ${mapping.length} URLs`);
      console.log(`- Unmapped: ${unmapped.length} URLs`);
      console.log(`- Categories: ${categoryMappings.length} URLs`);
      
      allMappings = allMappings.concat(mapping);
      allUnmapped = allUnmapped.concat(unmapped);
      allCategoryMappings = allCategoryMappings.concat(categoryMappings);
    }

    console.log(`\nFinal results:`);
    console.log(`Successfully mapped ${allMappings.length} product URLs`);
    console.log(`Unable to map ${allUnmapped.length} product URLs`);
    console.log(`Found ${allCategoryMappings.length} category URLs`);

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
    console.log("\nSample of mapped URLs:");
    allMappings.slice(0, 10).forEach(({ oldURL, newURL, oldName, newName, matchType, similarity, sku }) => {
      console.log(`- ${oldURL} → ${newURL}`);
      console.log(`  Product: "${oldName}" → "${newName}"`);
      console.log(`  Match type: ${matchType}, Similarity: ${similarity}${sku ? `, SKU: ${sku}` : ''}`);
    });

    console.log("\nSample of unmapped URLs:");
    allUnmapped.slice(0, 5).forEach(url => console.log(`- ${url}`));

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
    fs.writeFileSync('complete-url-mapping.csv', fullCsvContent);
    console.log("\nComplete CSV file has been saved as 'complete-url-mapping.csv'");

  } catch (error) {
    console.error("Error in URL mapping process:", error);
  }
}

// Execute the main function
generateURLMapping();