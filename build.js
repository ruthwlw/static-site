const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Configuration
const config = {
    content: path.join(__dirname, 'src', 'content'),
    templates: path.join(__dirname, 'src', 'templates'),
    css: path.join(__dirname, 'src', 'css'),
    images: path.join(__dirname, 'src', 'images'),
    dist: path.join(__dirname, 'dist'),
    src: path.join(__dirname, 'src')
};

// Ensure dist directory exists and is empty
fs.emptyDirSync(config.dist);

// Create necessary directories
fs.mkdirpSync(path.join(config.dist, 'blog'));
fs.mkdirpSync(path.join(config.dist, 'images'));

// Copy static files
fs.copySync(config.css, path.join(config.dist, 'css'));
fs.copySync(config.images, path.join(config.dist, 'images'));
fs.copySync(path.join(config.src, 'index.html'), path.join(config.dist, 'index.html'));
console.log('Copied: static files');

// Read base template
const baseTemplate = fs.readFileSync(
    path.join(config.templates, 'base.html'),
    'utf-8'
);

// Process markdown files
function processMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const html = marked.parse(content);
    
    // Extract title from first heading or use filename
    const title = content.match(/^#\s+(.+)/m)?.[1] || 
                 path.basename(filePath, '.md');

    // Apply template
    let page = baseTemplate
        .replace('{{ title }}', title)
        .replace('{{ content }}', html);

    return { title, html: page };
}

// Build pages
function buildPages(dir, baseOutputPath = '') {
    if (!fs.existsSync(dir)) {
        console.log(`Warning: Directory ${dir} does not exist, skipping...`);
        return;
    }

    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Recursively process subdirectories
            const newBasePath = path.join(baseOutputPath, item);
            fs.mkdirpSync(path.join(config.dist, newBasePath));
            buildPages(fullPath, newBasePath);
        } else if (path.extname(item) === '.md') {
            // Process markdown files
            const { html } = processMarkdown(fullPath);
            
            // Generate output path
            const outputName = path.basename(item, '.md') + '.html';
            const outputPath = path.join(config.dist, baseOutputPath, outputName);
            
            // Ensure output directory exists
            fs.mkdirpSync(path.dirname(outputPath));
            
            // Write the file
            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${outputPath}`);
        }
    });
}

// Start the build process
console.log('Building site...');
buildPages(path.join(config.content, 'pages'));
buildPages(path.join(config.content, 'blog', 'posts'), 'blog');
console.log('Site built successfully!'); 