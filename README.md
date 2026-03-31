World Law Explorer

This is a web application that lets users search and understand laws from countries around the world. Users select a country, type a legal topic, and receive a clear, plain-language explanation powered by AI. The app also supports comparing laws between two countries side by side.

 **Disclaimer:** It is AI-generated general legal information. It is not a substitute for professional legal advice.

---

## Features

- **Law Search** — Select a country and enter a legal topic to get a structured explanation covering overview, key rules, penalties, and recent changes.
- **Compare Mode** — Compare how two different countries handle the same legal topic, displayed side by side.
- **Search History** — All past searches are saved locally and can be browsed, filtered, or re-opened.
- **Bookmarks** — Save useful results for quick access later. Bookmarks can also be filtered.
- **Quick Topic Chips** — One-click shortcuts for popular legal topics (Property, Labour, Tax, etc.).
- **Copy to Clipboard** — Copy any result in one click.
- **Error Handling** — Graceful handling of API errors, network issues, empty inputs, and server misconfigurations with clear user feedback.
- **Responsive Design** — Works on desktop, tablet, and mobile screens.

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, no frameworks)
- **Backend:** Node.js with Express
- **API:** [Groq API](https://console.groq.com/) using the Meta Llama 3.1 8B model
- **Security:** API key stored server-side in a `.env` file, never exposed to the browser

---

## API Used

**Groq API** — [https://console.groq.com/docs](https://console.groq.com/docs)

Groq provides fast inference for open-source large language models. This application uses the `llama-3.1-8b-instant` model via the `/openai/v1/chat/completions` endpoint to generate legal explanations.

Credit: Groq Inc. for the API platform, and Meta for the Llama 3.1 model.

---

## How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Groq API key (get one free at [https://console.groq.com/keys](https://console.groq.com/keys))

### Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/GLOBAL-LAW-EXPLORER.git
   cd GLOBAL-LAW-EXPLORER
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file** in the project root:

   ```
   GROQ_API_KEY=your_api_key_here
   PORT=3000
   ```

4. **Start the server:**

   ```bash
   npm start
   ```

5. **Open your browser** and go to `http://localhost:3000`

---

## Project Structure
│── index.html      # Main HTML page
|── style.css       # All styles
|── app.js          # Frontend JavaScript (API calls, UI logic)
|── server.js           # Express server with API proxy routes
|── .env                # API key (NOT committed to git)
|── .gitignore          # Excludes node_modules, .env
|── README.md         
```

---

## Deployment to Web Servers

### Overview

The application is deployed on two standard web servers (Web01 and Web02) with a load balancer (Lb01) distributing traffic between them.

### Step 1: Prepare the Servers (Web01 and Web02)

On **each** web server, run the following:

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone the repository
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/GLOBAL-LAW-EXPLORER.git
cd GLOBAL-LAW-EXPLORER

# Install dependencies
sudo npm install

# Create the .env file
sudo nano .env
# Add: GROQ_API_KEY=your_api_key_here
# Add: PORT=3000
# Save and exit

# Test that it runs
npm start
# Verify at http://SERVER_IP:3000, then Ctrl+C to stop
```

#### Run as a Background Service with systemd

Create a service file so the app runs automatically:

```bash
sudo nano /etc/systemd/system/GLOBAL-LAW-EXPLORER.service
```

Paste the following:

```ini
[Unit]
Description=GLOBAL-LAW-EXPLORER
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/
ExecStart=/usr/bin/node server.js
Restart=on-failure
EnvironmentFile=/var/www/GLOBAL-LAW-EXPLORER/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable GLOBAL-LAW-EXPLORER
sudo systemctl start GLOBAL-LAW-EXPLORER
sudo systemctl status GLOBAL-LAW-EXPLORER   # Verify it's running
```

Repeat on both Web01 and Web02.

### Step 2: Configure Nginx as Reverse Proxy (Web01 and Web02)

On each web server, configure Nginx to proxy requests to the Node app:

```bash
sudo nano /etc/nginx/sites-available/GLOBAL-LAW-EXPLORER
```

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/GLOBAL-LAW-EXPLORER /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Remove default if exists
sudo nginx -t                               # Test configuration
sudo systemctl restart nginx
```

### Step 3: Configure Load Balancer (Lb01)

On the load balancer server, configure Nginx to distribute traffic:

```bash
sudo nano /etc/nginx/sites-available/GLOBAL-LAW-EXPLORER-lb
```

```nginx
upstream GLOBAL-LAW-EXPLORER_backend {
    server WEB01_IP;
    server WEB02_IP;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://GLOBAL-LAW-EXPLORER_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `WEB01_IP` and `WEB02_IP` with the actual IP addresses of your web servers.

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/GLOBAL-LAW-EXPLORER-lb /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Verify

- Visit `http://13.218.64.222/` in your browser — the app should load.
- Refresh multiple times and check Nginx access logs on Web01 and Web02 to confirm traffic is being distributed:

```bash
sudo tail -f /var/log/nginx/access.log
```

---

## Challenges Encountered

1. **API Key Security** — Initially the API key was embedded in the frontend JavaScript. Solved by creating an Express backend that proxies API requests, keeping the key in a `.env` file on the server.

2. **Markdown Rendering** — The Groq/Llama model returns markdown-formatted responses. Built a lightweight markdown-to-HTML parser to render headings, bold text, lists, and paragraphs correctly in the browser.

3. **Compare Mode Latency** — Comparing two countries requires two API calls. Used `Promise.all()` to run both requests in parallel, cutting wait time roughly in half.

4. **Responsive Layout for Compare** — The side-by-side comparison grid needed to stack to a single column on mobile. Handled with CSS Grid and a media query breakpoint at 700px.

---

## Credits

- **Groq API** — [https://groq.com](https://groq.com) — Fast AI inference platform
- **Meta Llama 3.1** — [https://llama.meta.com](https://llama.meta.com) — Open-source language model
- **DM Serif Display & DM Sans** — Google Fonts — Typography
- **Express.js** — [https://expressjs.com](https://expressjs.com) — Web framework for Node.js
- **dotenv** — [https://www.npmjs.com/package/dotenv](https://www.npmjs.com/package/dotenv) — Environment variable loader

---