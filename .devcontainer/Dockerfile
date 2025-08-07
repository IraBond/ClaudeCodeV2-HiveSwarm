FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install Python and MCP dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install global markdown tools
RUN npm install -g \
    markdownlint-cli \
    prettier \
    @mcp/server \
    typescript

# Create workspace
WORKDIR /workspace

# Install Python MCP dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Expose ports for MCP servers
EXPOSE 3000 8080 5173

CMD ["bash"]