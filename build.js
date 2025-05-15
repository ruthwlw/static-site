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
fs.mkdirpSync(path.join(config.dist, 'images/blog'));

// Copy static files
fs.copySync(config.css, path.join(config.dist, 'css'));
fs.copySync(config.images, path.join(config.dist, 'images'));
console.log('Copied: static files');

// Read templates
const baseTemplate = fs.readFileSync(
    path.join(config.templates, 'base.html'),
    'utf-8'
);

const blogTemplate = fs.readFileSync(
    path.join(config.templates, 'blog.html'),
    'utf-8'
);

const blogIndexTemplate = fs.readFileSync(
    path.join(config.templates, 'blog-index.html'),
    'utf-8'
);

// Process markdown files
function processMarkdown(filePath, template = baseTemplate) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract metadata from markdown
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1] || path.basename(filePath, '.md');
    const date = content.match(/\*Published on ([^*]+)\*/)?.[1];
    const author = content.match(/\*Author:\s*([^*]+)\*/)?.[1];

    // Get excerpt (first paragraph after metadata)
    const excerpt = content
        .split('\n\n')
        .slice(3, 4)
        .join('\n\n')
        .trim();

    // Remove the title and metadata from content for blog posts
    let contentWithoutTitle = content;
    if (template === blogTemplate) {
        contentWithoutTitle = content
            .replace(/^#\s+.+\n/, '') // Remove title
            .replace(/\*Published on [^*]+\*\n/, '') // Remove date
            .replace(/\*Author:[^*]+\*\n/, '') // Remove author
            .trim(); // Remove extra whitespace
    }

    // Convert markdown to HTML
    const html = marked.parse(content);
    const htmlWithoutTitle = marked.parse(contentWithoutTitle);

    // Apply template
    let page = template
        .replace(/{{ title }}/g, title)
        .replace('{{ content }}', html)
        .replace('{{ content_without_title }}', htmlWithoutTitle);

    // Replace date and author if they exist
    if (date) {
        page = page.replace(/{{ date }}/g, date);
    }
    
    // Handle author section
    const authorSection = author ? ` • <span class="author">by ${author.trim()}</span>` : '';
    page = page.replace('{{ author_section }}', authorSection);

    return { title, date, author, html: page, excerpt };
}

// Build pages
function buildPages(dir, baseOutputPath = '', template = baseTemplate) {
    if (!fs.existsSync(dir)) {
        console.log(`Warning: Directory ${dir} does not exist, skipping...`);
        return [];
    }

    const items = fs.readdirSync(dir);
    const posts = [];

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Recursively process subdirectories
            const newBasePath = path.join(baseOutputPath, item);
            fs.mkdirpSync(path.join(config.dist, newBasePath));
            posts.push(...buildPages(fullPath, newBasePath, template));
        } else if (path.extname(item) === '.md') {
            // Process markdown files
            const { html, title, date, author, excerpt } = processMarkdown(fullPath, template);
            
            // Generate output path
            const outputName = path.basename(item, '.md') + '.html';
            const outputPath = path.join(config.dist, baseOutputPath, outputName);
            const relativeUrl = path.join(baseOutputPath, path.basename(item, '.md'));
            
            // Ensure output directory exists
            fs.mkdirpSync(path.dirname(outputPath));
            
            // Write the file
            fs.writeFileSync(outputPath, html);
            console.log(`Built: ${outputPath}`);

            // Add to posts array for blog index
            if (template === blogTemplate) {
                posts.push({
                    title,
                    date,
                    author,
                    excerpt,
                    url: relativeUrl
                });
            }
        }
    });

    return posts;
}

// Generate blog index HTML
function generateBlogIndex(posts) {
    // Sort posts by date (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate HTML for each post
    const postsHtml = posts.map(post => `
        <article class="blog-post-card">
            <a href="${post.url}">
                <div class="blog-post-card-content">
                    <h2>${post.title}</h2>
                    <div class="post-meta">
                        <time datetime="${post.date}">${post.date}</time>
                        ${post.author ? ` • <span class="author">by ${post.author}</span>` : ''}
                    </div>
                    <p>${post.excerpt}</p>
                </div>
            </a>
        </article>
    `).join('\n');

    // Apply blog index template
    const indexHtml = blogIndexTemplate.replace('{{ blog_posts }}', postsHtml);
    
    // Write blog index file
    fs.writeFileSync(path.join(config.dist, 'blog.html'), indexHtml);
    console.log('Built: blog index page');
}

// Start the build process
console.log('Building site...');

// Build regular pages
buildPages(path.join(config.content, 'pages'));

// Build blog posts and get their metadata
const blogPosts = buildPages(path.join(config.content, 'blog', 'posts'), 'blog', blogTemplate);

// Generate blog index
generateBlogIndex(blogPosts);

console.log('Site built successfully!'); 