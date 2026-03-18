const axios = require("axios");

// ──────────────────────────────────────────────────────────
// Tool functions
// ──────────────────────────────────────────────────────────

/**
 * Fetch a Wikipedia article summary.
 * @param {string} query — the article title / topic
 * @returns {Promise<string>}
 */
async function searchWikipedia(query) {
  try {
    const encoded = encodeURIComponent(query.trim());
    const { data } = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
      { timeout: 8000 }
    );
    return data.extract || "No summary available for this topic.";
  } catch (err) {
    if (err.response?.status === 404) {
      return `Wikipedia article not found for "${query}".`;
    }
    return `Wikipedia lookup failed: ${err.message}`;
  }
}

/**
 * Fetch a file (default README.md) from a public GitHub repo.
 * @param {string} owner   — repo owner / org
 * @param {string} repo    — repository name
 * @param {string} [path]  — file path inside the repo (default: README.md)
 * @returns {Promise<string>}
 */
async function readGitHubRepo(owner, repo, path = "README.md") {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        timeout: 8000,
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "NexMind-AI-Assistant",
        },
      }
    );

    if (data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return `File "${path}" has no content.`;
  } catch (err) {
    if (err.response?.status === 404) {
      return `GitHub: "${owner}/${repo}/${path}" not found.`;
    }
    return `GitHub lookup failed: ${err.message}`;
  }
}

// ──────────────────────────────────────────────────────────
// Groq-compatible tool schemas (OpenAI format)
// ──────────────────────────────────────────────────────────

const toolsConfig = [
  {
    type: "function",
    function: {
      name: "search_wikipedia",
      description:
        "Search Wikipedia for a specific topic, concept, or person to get a factual summary.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The topic or article title to search on Wikipedia",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_github_repo",
      description:
        "Read the contents of a file from a public GitHub repository. IMPORTANT: Summarize the output using Markdown headings, bullet points, and your Golden Rule.",
      parameters: {
        type: "object",
        properties: {
          owner: {
            type: "string",
            description: "The GitHub username or organization that owns the repository",
          },
          repo: {
            type: "string",
            description: "The name of the repository",
          },
          path: {
            type: "string",
            description: "Path to a file inside the repository (default: README.md)",
          },
        },
        required: ["owner", "repo"],
      },
    },
  },
];

// Map function names → implementations for the execution loop
const toolExecutors = {
  search_wikipedia: async (args) => searchWikipedia(args.query),
  read_github_repo: async (args) =>
    readGitHubRepo(args.owner, args.repo, args.path),
};

module.exports = { toolsConfig, toolExecutors };
