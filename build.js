const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');

// Configuration
const config = {
    content: path.join(__dirname, 'src', 'content'),
    templates: path.join(__dirname, 'src', 'templates'),
    css: path.join(__dirname, 'src', 'css'),
    dist: path.join(__dirname, 'dist')
};

// Ensure dist directory exists and is empty
fs.emptyDirSync(config.dist);

// Create necessary directories
fs.mkdirpSync(path.join(config.dist, 'blog'));

// Copy CSS files
fs.copySync(config.css, path.join(config.dist, 'css'));

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

        // Skip index.md as we're using a direct index.html
        if (item === 'index.md') {
            return;
        }

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

// Create index.html template
const indexTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to My Website</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/blog">Blog</a>
            <a href="/about">About</a>
            <a href="/faq">FAQ</a>
        </nav>
    </header>

    <main>
        <h1>Welcome to My Website</h1>
        
        <p>Welcome to my personal website! Here you'll find my thoughts, experiences, and work.</p>
        
        <section>
            <h2>Recent Blog Posts</h2>
            <p>Check out my latest articles in the <a href="/blog">blog section</a>.</p>
        </section>
        
        <section>
            <h2>About Me</h2>
            <p>I'm passionate about technology and writing. Learn more <a href="/about">about me</a> and my journey.</p>
        </section>
        
        <section>
            <h2>Questions?</h2>
            <p>Have questions? Check out the <a href="/faq">FAQ page</a> for common inquiries.</p>
        </section>
    </main>

    <footer>
        <p>&copy; 2024 Your Name. All rights reserved.</p>
    </footer>
</body>
</html>`;

// Write index.html
fs.writeFileSync(path.join(config.dist, 'index.html'), indexTemplate);
console.log('Created: index.html');

// Start the build process
console.log('Building site...');
buildPages(path.join(config.content, 'pages'));
buildPages(path.join(config.content, 'blog', 'posts'), 'blog');
console.log('Site built successfully!'); 