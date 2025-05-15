const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by trying to serve the corresponding HTML file
app.get('*', (req, res) => {
    // Remove trailing slash and add .html
    const htmlPath = path.join(
        __dirname,
        'dist',
        req.path === '/' ? 'index.html' : `${req.path.replace(/\/$/, '')}.html`
    );

    res.sendFile(htmlPath, err => {
        if (err) {
            // If file not found, try serving it as a directory index
            const indexPath = path.join(
                __dirname,
                'dist',
                req.path.replace(/\/$/, ''),
                'index.html'
            );
            res.sendFile(indexPath, err => {
                if (err) {
                    res.status(404).send('Page not found');
                }
            });
        }
    });
});

// Function to try different ports
function startServer(port) {
    const server = http.createServer(app);
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

// Start the server
startServer(PORT); 