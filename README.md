
### Part 1: Introduction and Key Features

# URL Mapper

A tool for mapping URLs from an old website to a new website, perfect for creating 301 redirects during site migrations.

## 📋 Overview

This tool helps you create a mapping between URLs on an old website and their corresponding URLs on a new website. It's especially useful when migrating a website and you need to set up 301 redirects to maintain SEO value and prevent broken links.

### Key Features

- **General URL redirects** for blogs, articles, and content pages
- **SKU-based matching for E-commerce** for precise product URL mapping
- **Name-based similarity matching** as a fallback
- **Category redirect** support
- **Redirect loop detection** to prevent infinite loops
- **Batch processing** for handling large datasets
- **Detailed reporting** of match types and results
- **Highly customizable** for different website structures and needs

## 🔍 How It Works

1. **SKU Matching**: First tries to match products by SKU
2. **Name-Based Matching**: Falls back to matching by product name similarity
3. **Category Mapping**: Maps category pages using the category mappings
4. **Loop Detection**: Identifies and skips potential redirect loops

## 🛠️ Adapting for Different URL Structures

### WordPress to Shopify Migration

```javascript
const CONFIG = {
  newSiteBaseUrl: 'https://myshopify.com',
  productUrlPatterns: ['/product/', '/shop/'],
  categoryUrlPatterns: ['/product-category/', '/shop/'],
  categoryMappings: {
    'product-category/shirts': '/collections/shirts',
    'product-category/pants': '/collections/pants',
  }
};
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- Two CSV files:
  - Old URLs with SKUs
  - New URLs with SKUs

### Installation

1. **Clone or download** this repository to your computer

2. **Open a terminal or command prompt**

3. **Navigate to the project folder**:

   `cd path/to/url-mapper`

5. **Install dependencies** (only needed once):

  `npm install`

## 📊 Preparing Your Data

The script requires two CSV files with SKUs and URLs:

### 1. `old-urls.csv`

Contains SKUs and URLs from your **old website**

### 2. `new-urls.csv`

Contains SKUs and URLs from your **new website**

**Note**: The script supports various formats (comma, tab, or space-separated) and can handle URLs with or without the domain.

## 🔧 Customizing for Your Needs

The script is designed to be highly adaptable to different website structures and redirect needs. Here's how to customize it for your specific project:

### Basic Customization

Open `generic-url-mapper.js` in a text editor and modify the `CONFIG` object at the top:

```javascript
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
  hasHeaderRow: 'auto',
  
  // Matching options
  similarityThreshold: 0.5,
  highConfidenceThreshold: 0.8,
  mediumConfidenceThreshold: 0.6,
  
  // URL patterns
  productUrlPatterns: ['/product/', '/shop/'],
  categoryUrlPatterns: ['/product-category/', '/category/'],
  
  // Category mappings (old category slug -> new category path)
  categoryMappings: {
    'old-category': '/new-category-path/',
  },
  
  // Batch processing to manage memory usage
  batchSize: 250,
  
  // Debug options
  verbose: true,
  showSamples: true,
  sampleSize: 5
};
```

### Customization Examples for Different Website Types

#### E-commerce Site

```javascript
const CONFIG = {
  newSiteBaseUrl: 'https://myshop.com',
  productUrlPatterns: ['/product/', '/item/', '/p/'],
  categoryUrlPatterns: ['/category/', '/collection/', '/c/'],
  categoryMappings: {
    'mens-clothing': '/collections/men/',
    'womens-apparel': '/collections/women/',
    'accessories': '/collections/accessories/',
  }
};
```

#### Blog or Content Site

```javascript
const CONFIG = {
  newSiteBaseUrl: 'https://myblog.com',
  productUrlPatterns: ['/article/', '/post/'],
  categoryUrlPatterns: ['/category/', '/topic/', '/tag/'],
  categoryMappings: {
    'news': '/topics/latest-news/',
    'tutorials': '/learn/',
    'reviews': '/product-reviews/',
  }
};
```

#### Corporate Site

```javascript
const CONFIG = {
  newSiteBaseUrl: 'https://company.com',
  productUrlPatterns: ['/service/', '/solution/'],
  categoryUrlPatterns: ['/department/', '/sector/'],
  categoryMappings: {
    'about-us': '/company/about/',
    'contact': '/company/contact-us/',
    'careers': '/join-our-team/',
  }
};
```


### Part 4: More Customization Options

### Adjusting Matching Behavior

#### For Stricter Matching

```javascript
const CONFIG = {
  similarityThreshold: 0.7,  // Higher threshold requires closer matches
  highConfidenceThreshold: 0.9,
  mediumConfidenceThreshold: 0.8,
};
```

#### For More Lenient Matching

``` javascript
const CONFIG = {
  similarityThreshold: 0.3,  // Lower threshold allows more distant matches
  highConfidenceThreshold: 0.7,
  mediumConfidenceThreshold: 0.5,
};
```


### Part 5: Running and Understanding Results

## 🏃‍♂️ Running the Script

1. **Place your CSV files** in the same folder as the script (ensure they are named correctly: `old-urls.csv` and `new-urls.csv`)

2. `cd` into the directory with the Git Repo files

3. Install the dependencies and initialize node

  `npm install`

5. Run the script to begin teh mapping:

    `node url-mapper.js`
   
6. **Wait for processing** to complete (this may take a few minutes for large datasets)


## 📈 Understanding the Results

The script generates two output files:

### 1. `url-mapping.csv`

This ontains all valid redirects

### 2. `skipped-loops.csv`

Contains potential redirect loops that were skipped





