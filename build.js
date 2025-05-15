const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

const CONTENT_DIR = 'content';
const OUTPUT_DIR = 'public';
const TEMPLATE_DIR = 'templates';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function processMarkdownFile(filePath, template) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { attributes, body } = frontMatter(content);
  const html = marked.parse(body);
  
  return template
    .replace('{{title}}', attributes.title || 'Untitled')
    .replace('{{content}}', html);
}

async function buildSite() {
  // Ensure output directory exists
  await ensureDir(OUTPUT_DIR);
  
  // Read template
  const template = await fs.readFile(path.join(TEMPLATE_DIR, 'main.html'), 'utf-8');
  
  // Process markdown files
  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(CONTENT_DIR, fullPath);
      
      if (entry.isDirectory()) {
        // Create corresponding output directory
        await ensureDir(path.join(OUTPUT_DIR, relativePath));
        await processDirectory(fullPath);
      } else if (entry.isFile() && path.extname(entry.name) === '.md') {
        const outputPath = path.join(
          OUTPUT_DIR,
          relativePath.replace('.md', '.html')
        );
        
        const html = await processMarkdownFile(fullPath, template);
        await fs.writeFile(outputPath, html);
      }
    }
  }
  
  await processDirectory(CONTENT_DIR);
  console.log('Site built successfully!');
}

buildSite().catch(console.error); 