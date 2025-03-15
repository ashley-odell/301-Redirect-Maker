# URL Mapper

A tool for mapping URLs from an old website to a new website, perfect for creating 301 redirects during site migrations.


## 📋 Overview

When migrating a website, it’s crucial to set up proper redirects to prevent broken links and maintain SEO rankings. This tool simplifies the process by mapping old URLs to new ones automatically.


### **Key Features**

- **General URL redirects** for blogs, articles, and content pages
- **SKU-based matching for e-commerce** for precise product URL mapping
- **Name-based similarity matching** as a fallback
- **Category redirect** support
- **Redirect loop detection** to prevent infinite loops
- **Batch processing** for handling large datasets
- **Detailed reporting** of match types and results
- **Highly customizable** for different website structures and needs

## 🚀 Getting Started

### **1️⃣ Download the Project**

- Click the **"Code"** button at the top of this GitHub page.
- Select **"Download ZIP"** or clone using:
  ```sh
  git clone https://github.com/your-repo.git
  ```

### **2️⃣ Open Your Terminal**

- If you are on Windows, open **Command Prompt** (search for `cmd`).
- If you are on macOS or Linux, open **Terminal**.

### **3️⃣ Navigate to the Project Folder**

```sh
cd path/to/url-mapper
```

### **4️⃣ Initialize Your Project (Only if Needed)**

If your project does not already contain a `package.json` file, run:

```sh
npm init -y
```

This will generate a `package.json` file with default settings.

### **5️⃣ Install Required Dependencies**

```sh
npm install
```

> `npm install` downloads all the required dependencies for this project.

### **6️⃣ Run the Script**

```sh
node url-mapper.js
```

---

## 📊 Preparing Your Data

The script processes two CSV files containing old and new URLs. 

### **1️⃣ `old-urls.csv`** (Old Website)

| SKU | Old URL |
|-----|--------------------------------|
| 123 | https://oldsite.com/product/123 |
| 456 | https://oldsite.com/product/456 |

### **2️⃣ `new-urls.csv`** (New Website)

| SKU | New URL |
|-----|--------------------------------|
| 123 | https://newsite.com/products/123 |
| 456 | https://newsite.com/products/456 |

✅ The script supports **comma, tab, and space-separated files**.


## 🔧 Customization Options

This tool is designed to adapt to different website structures. You can customize settings by modifying the `CONFIG` object inside `generic-url-mapper.js`.

### **Basic Customization**

```javascript
const CONFIG = {
  oldUrlsFile: 'old-urls.csv',
  newUrlsFile: 'new-urls.csv',
  outputFile: 'url-mapping.csv',
  loopsFile: 'skipped-loops.csv',
  newSiteBaseUrl: 'https://example.com',
  csvDelimiters: [',', '\t', ';', ' '],
  hasHeaderRow: 'auto',
  similarityThreshold: 0.5,
  highConfidenceThreshold: 0.8,
  mediumConfidenceThreshold: 0.6,
  productUrlPatterns: ['/product/', '/shop/'],
  categoryUrlPatterns: ['/product-category/', '/category/'],
  categoryMappings: {
    'old-category': '/new-category-path/',
  },
  batchSize: 250,
  verbose: true,
  showSamples: true,
  sampleSize: 5
};
```

### **Custom Configuration for Different Website Types**

#### 🛒 **E-commerce Site**

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

#### 📝 **Blog or Content Site**

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

#### 🏢 **Corporate Website**

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


## 🏃‍♂️ Running the Script

### **1️⃣ Ensure Your CSV Files Are in the Correct Location**

- Place `old-urls.csv` and `new-urls.csv` in the same folder as `url-mapper.js`

### **2️⃣ Run the Script**

```sh
node url-mapper.js
```

### **3️⃣ Wait for Processing**

- Large datasets may take a few minutes.

### **4️⃣ Review the Output**

After running the script, you’ll see:

- ✅ **`url-mapping.csv`**: The final list of redirects.
- ❌ **`skipped-loops.csv`**: Redirects that could cause infinite loops.


## 🔍 Adjusting Matching Behavior

### **Stricter Matching (Higher Accuracy, Fewer Matches)**

```javascript
const CONFIG = {
  similarityThreshold: 0.7,
  highConfidenceThreshold: 0.9,
  mediumConfidenceThreshold: 0.8,
};
```

### **More Lenient Matching (More Matches, Less Precision)**

```javascript
const CONFIG = {
  similarityThreshold: 0.3,
  highConfidenceThreshold: 0.7,
  mediumConfidenceThreshold: 0.5,
};
```


## ❓ Need Help?

If you run into issues, feel free to open an issue on this GitHub repository.

---

This README is designed for **beginner developers** and ensures that setting up the URL Mapper is straightforward and hassle-free. 🚀

