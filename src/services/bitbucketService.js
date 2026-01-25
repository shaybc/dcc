import fetch from "node-fetch";
import { env } from "../utils/env.js";

/**
 * Bitbucket Data Center PR creation via REST.
 * Auth: Basic username/password (per user).
 */
function basicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`, "utf-8").toString("base64");
  return `Basic ${token}`;
}

/**
 * Attempt to parse Bitbucket projectKey + repoSlug from a git remote URL.
 * Supports common formats:
 * - https://host/scm/PROJ/repo.git
 * - https://host/projects/PROJ/repos/repo/browse (less common as remote)
 * - ssh: git@host:PROJ/repo.git (best-effort)
 */
export function parseBitbucketProjectRepo(remoteUrl) {
  const cleaned = remoteUrl.replace(/\.git$/, "");

  // https://host/scm/PROJ/repo
  const scmMatch = cleaned.match(/\/scm\/([^\/]+)\/([^\/]+)$/i);
  if (scmMatch) return { projectKey: scmMatch[1], repoSlug: scmMatch[2] };

  // https://host/projects/PROJ/repos/repo
  const projectsMatch = cleaned.match(/\/projects\/([^\/]+)\/repos\/([^\/]+)(\/.*)?$/i);
  if (projectsMatch) return { projectKey: projectsMatch[1], repoSlug: projectsMatch[2] };

  // ssh: git@host:PROJ/repo
  const sshMatch = cleaned.match(/:([^\/]+)\/([^\/]+)$/);
  if (sshMatch) return { projectKey: sshMatch[1], repoSlug: sshMatch[2] };

  throw new Error(`Unable to parse Bitbucket project/repo from remote URL: ${remoteUrl}`);
}

export async function createPullRequest({
  projectKey,
  repoSlug,
  fromBranch,
  toBranch,
  title,
  description = "",
  reviewers = []
}) {
  const username = env.BITBUCKET_USERNAME;
  const password = env.BITBUCKET_PASSWORD;
  if (!username || !password) {
    throw new Error("BITBUCKET_USERNAME and BITBUCKET_PASSWORD must be set in environment.");
  }

  const url = `${env.BITBUCKET_BASE_URL}/rest/api/1.0/projects/${encodeURIComponent(projectKey)}/repos/${encodeURIComponent(repoSlug)}/pull-requests`;

  const body = {
    title,
    description,
    state: "OPEN",
    open: true,
    closed: false,
    fromRef: {
      id: `refs/heads/${fromBranch}`,
      repository: {
        slug: repoSlug,
        project: { key: projectKey }
      }
    },
    toRef: {
      id: `refs/heads/${toBranch}`,
      repository: {
        slug: repoSlug,
        project: { key: projectKey }
      }
    },
    reviewers: reviewers.map(r => ({ user: { name: r } }))
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": basicAuthHeader(username, password),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bitbucket PR create failed (${res.status}): ${text}`);
  }
  const data = JSON.parse(text);

  // Bitbucket responses include "links.self[0].href"
  const prUrl = data?.links?.self?.[0]?.href || null;
  return { prUrl, raw: data };
}
