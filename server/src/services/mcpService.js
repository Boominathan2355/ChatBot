const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const UserSettings = require('../models/UserSettings');

class MCPService {
    constructor() {
        this.clients = new Map(); // userId -> Map<serverName, Client>
    }

    // Initialize connections for a user based on their settings
    async initializeUser(userId) {
        try {
            const settings = await UserSettings.findOne({ userId });
            if (!settings || !settings.mcpServers) return;

            // Clear existing clients for this user
            if (this.clients.has(userId)) {
                for (const client of this.clients.get(userId).values()) {
                    try { await client.close(); } catch (e) { console.error('Error closing client:', e); }
                }
                this.clients.delete(userId);
            }

            const userClients = new Map();

            for (const server of settings.mcpServers) {
                if (!server.enabled) continue;

                try {
                    let transport;
                    if (server.type === 'stdio') {
                        transport = new StdioClientTransport({
                            command: server.command,
                            args: server.args || [],
                            env: server.env || {}
                        });
                    } else if (server.type === 'sse') {
                        transport = new SSEClientTransport({
                            url: server.url,
                            eventSourceInit: { dict: server.headers || {} }
                        });
                    } else {
                        console.warn(`Unknown transport type: ${server.type}`);
                        continue;
                    }

                    const client = new Client({
                        name: "JarvisAI",
                        version: "1.0.0",
                    }, {
                        capabilities: {
                            tools: {},
                            resources: {}
                        }
                    });

                    await client.connect(transport);
                    userClients.set(server.name, client);
                    console.log(`Connected to MCP server: ${server.name}`);

                } catch (error) {
                    console.error(`Failed to connect to MCP server ${server.name}:`, error);
                }
            }

            this.clients.set(userId, userClients);

        } catch (error) {
            console.error('MCP Initialization Error:', error);
        }
    }

    // Get all available tools for a user
    async getTools(userId) {
        const tools = [];
        if (!this.clients.has(userId)) {
            await this.initializeUser(userId);
        }

        const userClients = this.clients.get(userId);
        if (!userClients) return tools;

        for (const [serverName, client] of userClients.entries()) {
            try {
                const result = await client.listTools();
                const serverTools = result.tools.map(tool => ({
                    ...tool,
                    serverName, // Tag the tool with its source server
                    functionName: `${serverName}__${tool.name}` // Namespace the tool
                }));
                tools.push(...serverTools);
            } catch (error) {
                console.error(`Error listing tools for ${serverName}:`, error);
            }
        }
        return tools;
    }

    // Call a specific tool
    async callTool(userId, serverName, toolName, args) {
        const userClients = this.clients.get(userId);
        if (!userClients) throw new Error('MCP not initialized for user');

        const client = userClients.get(serverName);
        if (!client) throw new Error(`Server ${serverName} not found`);

        const result = await client.callTool({
            name: toolName,
            arguments: args
        });

        return result;
    }
}

module.exports = new MCPService();
